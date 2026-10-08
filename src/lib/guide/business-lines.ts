/**
 * "What moves this stock" knowledge base: business line -> the regulators, policies, commodities and
 * competitive forces that actually move earnings. A stock is mapped to 1-3 business lines (curated
 * overrides first, then company-name and NSE industry rules), so a stock is explained by what it DOES
 * (insurance distribution, gold loans, city gas ...) and not only by crude / rupee / yields / S&P.
 *
 * Pure data + pure functions: no I/O, instant, free. Live evidence for each driver is attached
 * separately (driver-news.ts) from public news feeds.
 */

export type DriverKind = "regulation" | "policy" | "commodity" | "macro" | "competition" | "demand";

export type Driver = {
  id: string;
  label: string;
  kind: DriverKind;
  /** Who sets the rule or the number (shown as the source of truth). */
  authority: string;
  /** Plain-language mechanism: what changes and which way it hurts or helps. */
  why: string;
  /** Google News query used to find live evidence (30-day window is added by the fetcher). */
  q: string;
  /** Regex source: a headline must match this to count as evidence for the driver. */
  kw: string;
};

export type BusinessLine = {
  id: string;
  label: string;
  /** Regex source matched against the company name (strong signal). */
  names?: string;
  /** NSE industry labels (weak signal, used when no name rule hits). */
  industries?: string[];
  drivers: Driver[];
};

export const AUTHORITY_URL: Record<string, string> = {
  RBI: "https://www.rbi.org.in/",
  IRDAI: "https://irdai.gov.in/",
  SEBI: "https://www.sebi.gov.in/",
  TRAI: "https://www.trai.gov.in/",
  DoT: "https://dot.gov.in/",
  CERC: "https://cercind.gov.in/",
  DGCA: "https://www.dgca.gov.in/",
  FSSAI: "https://www.fssai.gov.in/",
  NPPA: "https://www.nppaindia.nic.in/",
  CDSCO: "https://cdsco.gov.in/",
  USFDA: "https://www.fda.gov/",
  MoRTH: "https://morth.nic.in/",
  PNGRB: "https://www.pngrb.gov.in/",
  PPAC: "https://ppac.gov.in/",
  MNRE: "https://mnre.gov.in/",
  MoD: "https://www.mod.gov.in/",
  DGTR: "https://www.dgtr.gov.in/",
  CCI: "https://www.cci.gov.in/",
  NPCI: "https://www.npci.org.in/",
  GST: "https://www.gst.gov.in/",
  "Ministry of Finance": "https://finmin.nic.in/",
  "Ministry of Railways": "https://indianrailways.gov.in/",
  "Ministry of Coal": "https://coal.gov.in/",
  "Ministry of Steel": "https://steel.gov.in/",
  "Ministry of Power": "https://powermin.gov.in/",
  "Ministry of Agriculture": "https://agriwelfare.gov.in/",
  "Ministry of Commerce": "https://commerce.gov.in/",
  "Ministry of I&B": "https://mib.gov.in/",
  "Ministry of Civil Aviation": "https://www.civilaviation.gov.in/",
  RERA: "https://rera.gov.in/",
  NHAI: "https://nhai.gov.in/",
  "US government": "https://www.usa.gov/",
  "Market data": "",
};

const d = (id: string, label: string, kind: DriverKind, authority: string, why: string, q: string, kw: string): Driver => ({ id, label, kind, authority, why, q, kw });

/* Reusable drivers shared by several lines. */
const RATES = d("repo-rate", "RBI repo rate and liquidity", "macro", "RBI", "Rate cuts lower funding and loan costs and lift credit demand; a hold or hike squeezes spreads and slows loan growth.", "RBI repo rate monetary policy MPC", "repo|rate cut|rate hike|monetary policy|mpc|crr|liquidity");
const MONSOON = d("monsoon", "Monsoon and rural demand", "demand", "Market data", "A weak monsoon cuts farm income and rural spending on two-wheelers, FMCG, tractors and fertiliser; a good one lifts them.", "monsoon rainfall rural demand India", "monsoon|rainfall|rural demand|kharif|rabi");
const GST = (what: string, q: string, kw: string) => d("gst-rate", `GST rate changes on ${what}`, "policy", "GST", `A GST Council change on ${what} directly moves prices, demand and margins.`, q, kw);
const USD = d("usd-inr", "Rupee vs dollar", "macro", "RBI", "Dollar revenue or costs flow through the rupee: a weaker rupee lifts exporters' earnings and raises importers' costs.", "rupee dollar exchange rate RBI intervention", "rupee|usd/inr|dollar");
const CAPEX = d("govt-capex", "Government capex and Budget allocation", "policy", "Ministry of Finance", "Order inflows follow central and state capital spending announced in the Budget and tracked monthly.", "India government capex budget allocation infrastructure spending", "capex|capital expenditure|budget|allocation|infrastructure spending");
const CHINA = d("china-dumping", "Cheap Chinese imports and anti-dumping duty", "competition", "DGTR", "Chinese oversupply undercuts Indian prices; anti-dumping or safeguard duty is the main protection.", "DGTR anti-dumping duty China imports India", "anti-dumping|safeguard duty|dgtr|china import|cheap import");

export const BUSINESS_LINES: BusinessLine[] = [
  {
    id: "bank-private",
    label: "Private banks",
    names: "\\b(hdfc bank|icici bank|axis bank|kotak mahindra bank|indusind|idfc first|yes bank|federal bank|bandhan|rbl|city union|karur|south indian|dcb|csb|tmb|karnataka bank|ujjivan small|equitas small|au small|jammu|ib\\b|bank\\b|small finance)",
    drivers: [
      RATES,
      d("rbi-unsecured", "RBI risk weights and curbs on unsecured / retail lending", "regulation", "RBI", "Higher risk weights raise capital needs and slow personal-loan, card and NBFC-lending growth.", "RBI risk weights unsecured loans banks NBFC lending", "risk weight|unsecured|personal loan|credit card|bank credit to nbfc"),
      d("deposit-lcr", "Deposit growth, CD ratio and RBI liquidity (LCR) norms", "regulation", "RBI", "Deposits growing slower than loans lifts funding costs; tougher LCR run-off norms force banks to hold more low-yield bonds.", "bank deposit growth credit deposit ratio LCR RBI", "deposit growth|credit-deposit|cd ratio|lcr|liquidity coverage"),
      d("asset-quality", "Asset quality, slippages and RBI provisioning rules", "regulation", "RBI", "New provisioning norms (expected-credit-loss) and stress in microfinance or unsecured loans raise credit costs.", "RBI provisioning expected credit loss banks NPA slippages", "npa|slippage|provisioning|expected credit loss|ecl|stressed"),
      d("digital-fraud", "RBI digital-lending, fraud and customer-protection rules", "regulation", "RBI", "Tighter rules on digital loans, mis-selling and fraud liability add compliance cost and restrict fee income.", "RBI digital lending guidelines fraud rules banks penalty", "digital lending|fraud|penalty|customer protection|kyc"),
    ],
  },
  {
    id: "bank-psu",
    label: "PSU banks",
    names: "\\b(state bank of india|bank of baroda|punjab national|canara|union bank of india|bank of india|indian bank|central bank of india|indian overseas|uco bank|bank of maharashtra|punjab & sind)",
    drivers: [
      RATES,
      d("psb-reform", "Government recapitalisation, merger and privatisation plans", "policy", "Ministry of Finance", "Stake sales, mergers and capital infusions change supply of shares, capital strength and valuation.", "PSU banks privatisation merger government stake sale recapitalisation", "privatis|merger|stake sale|oFS|recapitali|disinvest"),
      d("asset-quality", "Asset quality, slippages and RBI provisioning rules", "regulation", "RBI", "New provisioning norms and stress in agriculture or MSME loans move credit costs; recoveries lift profit.", "PSU bank NPA recovery provisioning RBI", "npa|slippage|provisioning|recovery|ecl"),
      d("bond-yields", "Government bond yields (treasury gains and losses)", "macro", "Market data", "Banks hold large bond books: rising yields cause mark-to-market losses, falling yields give treasury gains.", "India 10 year government bond yield RBI OMO", "bond yield|g-sec|gsec|10-year|omo|treasury"),
      d("deposit-lcr", "Deposit growth, CD ratio and RBI liquidity (LCR) norms", "regulation", "RBI", "Slow deposits raise funding cost; stricter LCR norms force more low-yield holdings.", "bank deposit growth credit deposit ratio LCR RBI", "deposit growth|credit-deposit|cd ratio|lcr"),
    ],
  },
  {
    id: "nbfc",
    label: "NBFCs and housing finance",
    names: "\\b(finance|finserv|housing|capital|credit|leasing|fincorp|financial|finance\\b|finserv|fincorp|credit|capital|leasing|investments?|securities|holdings\\b|microfin|housing fin|loans?|nidhi)\\b",
    industries: ["Financial Services"],
    drivers: [
      d("nbfc-rules", "RBI scale-based regulation, risk weights and NBFC norms", "regulation", "RBI", "Higher risk weights, tighter NPA recognition or caps on lending products raise capital needs and slow growth.", "RBI NBFC regulation scale based risk weights norms", "nbfc|risk weight|scale based|norms|rbi circular"),
      d("funding-cost", "Bank borrowing costs and bond-market funding", "macro", "RBI", "NBFCs borrow from banks and bond markets; costlier or scarcer funding squeezes spreads immediately.", "NBFC funding cost bank loans bond market borrowing", "funding cost|borrowing cost|bank lending to nbfc|bond market|cost of funds"),
      RATES,
      d("collections-stress", "Collections, delinquencies and borrower stress", "demand", "Market data", "Rising defaults in unsecured, microfinance or vehicle loans raise credit costs.", "NBFC asset quality collections delinquencies stress microfinance", "delinquen|collection|stress|npa|microfinance"),
    ],
  },
  {
    id: "gold-loan",
    label: "Gold loans",
    names: "\\b(muthoot|manappuram|iifl finance)",
    drivers: [
      d("gold-loan-rules", "RBI gold-loan norms (LTV, valuation, bullet loans)", "regulation", "RBI", "Stricter loan-to-value and end-use checks cut ticket sizes and the interest-only bullet product that drives volumes.", "RBI gold loan norms LTV bullet repayment", "gold loan|ltv|bullet|valuation"),
      d("gold-price", "Gold price", "commodity", "Market data", "Higher gold lifts loan sizes and AUM at the same LTV; a sharp fall raises auction and collateral risk.", "gold price India MCX record", "gold price|gold rate|bullion"),
      RATES,
    ],
  },
  {
    id: "insurance-distribution",
    label: "Insurance distribution and online marketplaces",
    names: "\\b(pb fintech|policybazaar|policy bazaar)",
    drivers: [
      d("irdai-commission", "IRDAI commission, expense-of-management and distribution rules", "regulation", "IRDAI", "Caps on commissions or payouts to distributors cut revenue per policy sold; rules on mis-selling can force refunds.", "IRDAI commission cap expense of management distributors rules", "commission|expense of management|eom|distributor|mis-selling|payout"),
      d("insurer-direct", "Insurers selling direct and Bima Sugam platform", "competition", "IRDAI", "A government-backed insurance marketplace or insurers pushing their own apps reduces dependence on aggregators.", "Bima Sugam IRDAI marketplace insurers direct sales", "bima sugam|direct channel|insurtech|aggregator"),
      GST("insurance premiums", "GST on insurance premiums life health input tax credit", "gst.*(insurance|premium)|input tax credit|itc.*insurance"),
      d("insurance-tax", "Tax treatment of life insurance and ULIPs", "policy", "Ministry of Finance", "Taxing high-premium policies or removing 80C style benefits reduces demand for savings-linked insurance.", "insurance policy tax ULIP maturity proceeds budget", "ulip|10\\(10d\\)|maturity|80c|tax on insurance"),
    ],
  },
  {
    id: "insurance-life",
    label: "Life insurance",
    names: "\\b(life insurance|lic of india|life insurance corporation|sbi life|hdfc life|icici prudential life|max financial|star health)",
    drivers: [
      d("irdai-surrender", "IRDAI surrender-value, commission and product rules", "regulation", "IRDAI", "Higher surrender values and commission caps compress margins and change which products sell.", "IRDAI surrender value commission life insurance regulations", "surrender|commission|product regulation|irdai"),
      d("insurance-tax", "Tax treatment of life insurance and ULIPs", "policy", "Ministry of Finance", "Tax rules decide whether insurance competes with mutual funds and fixed deposits.", "life insurance tax ULIP budget", "ulip|tax|80c|10\\(10d\\)"),
      GST("insurance premiums", "GST on insurance premiums life health", "gst.*(insurance|premium)|input tax credit"),
      d("bancassurance", "Bank distribution and mis-selling rules", "regulation", "IRDAI", "Most sales come through banks; tougher mis-selling or tie-up limits hit new-business volumes.", "bancassurance mis-selling IRDAI banks insurance sales", "bancassurance|mis-selling|bank distribution"),
    ],
  },
  {
    id: "insurance-general",
    label: "General and health insurance",
    names: "\\b(general insurance|new india assurance|gic re|general insurance corporation|icici lombard|star health|niva|go digit|care health)",
    drivers: [
      d("health-claims", "Health-claim, cashless and hospital-tariff rules", "regulation", "IRDAI", "Rules on cashless claims, claim settlement timelines and medical inflation decide claims ratio.", "IRDAI health insurance claims cashless hospital tariff", "cashless|claim|hospital|health insurance|medical inflation"),
      d("motor-tp", "Motor third-party premium and vehicle sales", "regulation", "MoRTH", "Third-party premium revisions and new-vehicle sales drive the largest general-insurance line.", "motor third party premium hike IRDAI MoRTH", "third party|third-party|motor insurance|premium hike"),
      d("catastrophe", "Floods, cyclones and catastrophe losses", "demand", "Market data", "Weather events raise claims and reinsurance costs.", "India floods cyclone insurance claims losses", "flood|cyclone|catastrophe|claims|heatwave"),
      GST("insurance premiums", "GST on health insurance premiums", "gst.*(insurance|premium|health)"),
    ],
  },
  {
    id: "amc-broking",
    label: "Asset managers, brokers and wealth",
    names: "\\b(amc|asset management|angel one|nuvama|360 one|motilal oswal|iifl|anand rathi|cams|kfin|computer age|jm financial|edelweiss|prudent|aditya birla sun life amc|hdfc asset|nippon life|uti asset|broking|brokers?|securities|wealth|stock\\b|share\\b|asset manag|funds? management|registrar|rta\\b)",
    drivers: [
      d("sebi-fo", "SEBI curbs on derivatives (F&O) and retail participation", "regulation", "SEBI", "Lot-size, expiry and margin changes cut retail F&O volumes, the biggest broker and exchange earner.", "SEBI F&O curbs weekly expiry lot size retail traders", "f&o|derivative|expiry|lot size|retail trader"),
      d("sebi-ter", "SEBI mutual-fund expense (TER) and brokerage caps", "regulation", "SEBI", "Lower expense ratios and brokerage caps reduce fee income per rupee of assets.", "SEBI TER mutual fund expense ratio brokerage cap", "ter|expense ratio|brokerage|true to label"),
      d("market-flows", "SIP flows, market levels and retail activity", "demand", "Market data", "Fees follow assets and trading volumes, which rise and fall with markets and SIP flows.", "SIP inflows mutual fund AUM demat accounts record", "sip|aum|demat|inflow"),
      d("tax-markets", "Capital-gains tax and STT changes", "policy", "Ministry of Finance", "Tax on trading and gains changes after-tax returns and trading activity.", "STT capital gains tax change budget market", "stt|capital gains|securities transaction tax"),
    ],
  },
  {
    id: "exchange-depository",
    label: "Exchanges, depositories and market infrastructure",
    names: "\\b(bse ltd|mcx|multi commodity|central depository|cdsl|indian energy exchange|nse)",
    drivers: [
      d("sebi-fo", "SEBI curbs on derivatives (F&O) and retail participation", "regulation", "SEBI", "Option-expiry and lot-size rules directly set transaction revenue.", "SEBI F&O weekly expiry lot size exchanges revenue", "f&o|expiry|lot size|derivative"),
      d("sebi-charges", "SEBI transaction-charge and market-structure rules", "regulation", "SEBI", "Uniform fees and new clearing rules change exchange take-rates.", "SEBI transaction charges exchanges clearing corporation rules", "transaction charge|clearing|true to label|market structure"),
      d("tax-markets", "STT and capital-gains tax changes", "policy", "Ministry of Finance", "Higher trading taxes dampen volumes.", "STT hike derivatives budget", "stt|securities transaction tax"),
    ],
  },
  {
    id: "payments-fintech",
    label: "Payments and fintech",
    names: "\\b(one 97|paytm|mobikwik|pine labs|razorpay|cams|fino|ixigo|jio financial|bajaj finserv)",
    drivers: [
      d("upi-mdr", "UPI charges (MDR) and NPCI market-share caps", "regulation", "NPCI", "Zero MDR on UPI limits revenue; a market-share cap or incentive change reshapes who wins volume.", "UPI MDR NPCI market share cap payments", "upi|mdr|market share cap|npci"),
      d("pa-rules", "RBI payment-aggregator and wallet rules", "regulation", "RBI", "Licensing, KYC and settlement rules for aggregators and wallets decide who can operate and at what cost.", "RBI payment aggregator wallet KYC rules fintech action", "payment aggregator|wallet|payments bank|kyc|pa-cb"),
      d("digital-lending-rules", "RBI digital-lending and P2P rules", "regulation", "RBI", "Rules on loan service providers, default-loss guarantees and P2P platforms limit fintech lending models.", "RBI digital lending P2P lending rules fintech", "digital lending|p2p|loan service provider|dlg"),
    ],
  },
  {
    id: "credit-cards",
    label: "Credit cards and consumer lending",
    names: "\\b(sbi cards|sbi card|cholamandalam|bajaj finance|aditya birla capital|poonawalla|l&t finance|shriram finance)",
    drivers: [
      d("rbi-unsecured", "RBI risk weights and curbs on unsecured lending", "regulation", "RBI", "Higher risk weights raise capital cost on cards and personal loans.", "RBI risk weights credit cards personal loans", "risk weight|credit card|unsecured|personal loan"),
      d("collections-stress", "Collections and delinquencies in retail loans", "demand", "Market data", "Rising defaults raise credit costs.", "retail loan delinquencies credit card defaults India", "delinquen|default|npa|stress"),
      RATES,
    ],
  },
  {
    id: "it-services",
    label: "IT services",
    names: "\\b(tata consultancy|infosys|wipro|hcl tech|tech mahindra|ltimindtree|persistent|coforge|mphasis|oracle financial|l&t technology|kpit|tata elxsi|cyient|zensar|sonata|birlasoft|hexaware|cyient|infotech|software|softech|technolog|systems\\b|digital|solutions|info\\b|computers?|cloud|data\\b|analytics|datamatics|ksolves|consult)",
    industries: ["Information Technology"],
    drivers: [
      d("us-visa", "US H-1B, visa and outsourcing policy", "policy", "US government", "Higher visa fees, quotas or an outsourcing tax raise onsite costs and can cut offshore demand.", "H-1B visa fee outsourcing tax US IT services India", "h-1b|visa|outsourcing|hire act"),
      d("client-budgets", "US and Europe tech budgets (banks, retail, telecom clients)", "demand", "Market data", "IT spending follows client profits; deal wins and ramp-downs show up first in peer results.", "IT services deal wins demand discretionary spending Accenture guidance", "deal win|discretionary|guidance|accenture|demand"),
      d("genai", "Generative AI and productivity deflation", "competition", "Market data", "AI coding and automation can cut billable hours and pricing, while creating new modernisation projects.", "generative AI impact Indian IT services pricing deflation", "genai|generative ai|agentic|ai deflation|automation"),
      USD,
    ],
  },
  {
    id: "pharma",
    label: "Pharma and generics",
    names: "\\b(sun pharma|dr\\.? reddy|cipla|lupin|aurobindo|zydus|torrent pharma|alkem|mankind|biocon|glenmark|ipca|natco|ajanta|abbott india|gland|laurus|granules|divi|eris|jb chem|alembic|pfizer|glaxo|sanofi|wockhardt|pharma|drugs|lifescience|life sciences?|biosciences?|biotech|laborator|biologics|remedies|medicare|formulations)",
    industries: ["Healthcare"],
    drivers: [
      d("usfda", "USFDA inspections, warning letters and import alerts", "regulation", "USFDA", "An adverse observation can block exports from a plant and wipe out the earnings of products made there.", "USFDA inspection warning letter Form 483 Indian pharma plant", "usfda|fda|483|warning letter|import alert|osi"),
      d("us-pricing", "US generic price erosion and drug-pricing policy", "policy", "US government", "US buyer consolidation, tariffs and pricing rules compress generic margins.", "US generic drug prices tariff pharma India pricing policy", "tariff|section 232|generic price|drug pricing|most favored"),
      d("nppa", "Price control on essential medicines", "regulation", "NPPA", "NLEM price caps and annual price revisions limit domestic pricing.", "NPPA price control NLEM essential medicines", "nppa|price control|nlem|ceiling price"),
      d("api-china", "API supply from China and PLI incentives", "competition", "Ministry of Commerce", "Dependence on Chinese raw materials makes margins sensitive to prices and supply; PLI helps domestic production.", "pharma API China dependence PLI scheme India", "api|china|pli|key starting material"),
    ],
  },
  {
    id: "hospitals-diagnostics",
    label: "Hospitals and diagnostics",
    names: "\\b(apollo hospitals|fortis|max healthcare|narayana|aster dm|global health|krishna institute|medanta|rainbow|dr\\.? lal|metropolis|thyrocare|vijaya diagnostic|healthcare global|yatharth|kims|lal path|hosp|nephro|diagnost|clinic|health serv|healthcare|medical|scan)",
    drivers: [
      d("insurer-hospital", "Insurer and hospital tariff disputes, cashless rules", "regulation", "IRDAI", "Disputes over cashless rates and claim denials affect patient flow and realisation per bed.", "hospital insurers cashless dispute tariff IRDAI", "cashless|tariff|claim|insurer"),
      d("nppa-devices", "Price caps on stents, implants and drugs", "regulation", "NPPA", "Caps on devices and consumables cut hospital margins.", "NPPA price cap stents implants hospitals", "nppa|price cap|stent|implant"),
      d("govt-health", "Government health schemes (Ayushman, CGHS) and rates", "policy", "Ministry of Finance", "Scheme package rates and coverage expansion set volume and price for a share of patients.", "Ayushman Bharat CGHS rates hospitals empanelment", "ayushman|cghs|pmjay|package rate"),
    ],
  },
  {
    id: "auto-oem",
    label: "Automobiles",
    names: "\\b(maruti|tata motors|mahindra & mahindra|hyundai motor|bajaj auto|hero motocorp|eicher|tvs motor|ashok leyland|force motors|escorts|sml isuzu|olectra)",
    industries: ["Automobile and Auto Components"],
    drivers: [
      GST("vehicles", "GST rate on cars two-wheelers cess", "gst|cess"),
      d("ev-policy", "EV subsidies, mandates and local-content rules", "policy", "Ministry of Finance", "Incentive changes (PM E-DRIVE, PLI auto) shift the pace of EV adoption and the profit of petrol-vehicle makers.", "EV subsidy PM E-DRIVE PLI auto India policy", "ev|subsidy|e-drive|pli|electric vehicle"),
      d("emission", "Emission and safety norms (BS, CAFE, ABS)", "regulation", "MoRTH", "Stricter norms raise cost per vehicle and can pull forward or delay demand.", "emission norms CAFE safety rules MoRTH vehicle", "emission|cafe|bs-vi|abs|safety norm|airbag"),
      d("commodity-auto", "Steel, aluminium and rare-earth magnet supply", "commodity", "Market data", "Input prices and rare-earth or chip shortages set margin and production.", "auto makers steel aluminium rare earth magnets chip shortage", "rare earth|chip|semiconductor|steel price|aluminium"),
      MONSOON,
    ],
  },
  {
    id: "auto-parts",
    label: "Auto parts and tyres",
    names: "\\b(bosch|motherson|sona blw|uno minda|bharat forge|schaeffler|timken|endurance|exide|amara raja|apollo tyres|mrf|ceat|balkrishna|jk tyre|sundram|minda|gabriel|varroc|craftsman|tube investments|lumax|autos\\b|automobile|cycles?|auto tech|auto parts|ancillar|wheels|gears?|brakes?|springs?|rubber|tyres?)",
    drivers: [
      d("oem-volumes", "OEM production volumes and inventory", "demand", "Market data", "Parts demand follows monthly vehicle production and dealer stock.", "auto sales monthly SIAM dealer inventory FADA", "siam|fada|dealer inventory|vehicle sales|production"),
      d("rubber-crude", "Natural rubber, carbon black and crude prices (tyres)", "commodity", "Market data", "Raw materials are over half of tyre cost, so margins follow rubber and crude with a lag.", "natural rubber price tyre makers raw material", "rubber|carbon black|crude|tyre"),
      d("ev-policy", "EV transition and supplier content", "policy", "Ministry of Finance", "EVs cut demand for engine and transmission parts and add battery and electronics content.", "EV transition auto component makers impact", "ev|electric vehicle|battery|component"),
      CHINA,
    ],
  },
  {
    id: "fmcg",
    label: "FMCG and consumer staples",
    names: "\\b(hindustan unilever|itc|nestle|britannia|dabur|godrej consumer|marico|colgate|tata consumer|emami|varun beverages|united spirits|united breweries|radico|patanjali|bikaji|jyothy|gillette|procter|zydus wellness|bajaj consumer|snacks|foods?\\b|beverages?|dairy|bakers?|biscuits|confection|consumer|personal care|soaps?|tea\\b|coffee)",
    industries: ["Fast Moving Consumer Goods"],
    drivers: [
      MONSOON,
      d("edible-oil-duty", "Edible oil import duty and palm-oil prices", "policy", "Ministry of Finance", "Palm and vegetable oil are key inputs for soaps, foods and snacks; duty changes move costs.", "edible oil import duty palm oil price India FMCG", "palm oil|edible oil|import duty|soybean"),
      d("food-prices", "Wheat, sugar, milk and cocoa prices", "commodity", "Ministry of Agriculture", "Food-input inflation compresses margins until price hikes are passed on.", "wheat sugar milk cocoa price inflation FMCG margins", "wheat|sugar|milk|cocoa|coffee|inflation"),
      d("fssai", "FSSAI labelling and food-safety rules", "regulation", "FSSAI", "Front-of-pack warnings and ingredient bans change product mix and cost.", "FSSAI labelling front of pack rules ban", "fssai|labelling|front-of-pack|ban"),
      GST("packaged food and consumer goods", "GST rate cut packaged food consumer goods", "gst"),
    ],
  },
  {
    id: "alcohol-tobacco",
    label: "Alcohol and tobacco",
    names: "\\b(itc|united spirits|united breweries|radico|allied blenders|tilaknagar|globus spirits|sula|godfrey|vst)",
    drivers: [
      d("sin-tax", "Sin-tax, excise and cigarette duty changes", "policy", "Ministry of Finance", "Excise or GST compensation-cess changes move cigarette and liquor prices and volumes.", "cigarette excise duty tax hike budget GST 40%", "excise|cigarette|sin tax|cess|40%"),
      d("state-excise", "State excise and liquor policies", "regulation", "Ministry of Finance", "State pricing, licence and bottling rules decide volumes and margin in each market.", "state excise policy liquor prices licence India", "excise policy|liquor|state excise|licence"),
    ],
  },
  {
    id: "consumer-internet",
    label: "Consumer internet and quick commerce",
    names: "\\b(zomato|eternal|swiggy|nykaa|fsn e-commerce|info edge|naukri|delhivery|cartrade|indiamart|policybazaar|paytm|trent|dmart|avenue supermarts|vishal|shoppers stop|honasa|mamaearth|firstcry|brainbees|lenskart|meesho|urban company)",
    drivers: [
      d("gig-code", "Gig-worker social-security code and delivery-fee tax", "regulation", "Ministry of Finance", "Mandatory contributions and GST on delivery or platform fees raise cost per order.", "gig workers social security code GST delivery fee platforms", "gig|social security|delivery fee|platform fee|gst"),
      d("fdi-ecom", "FDI rules, antitrust and dark-store regulation", "regulation", "CCI", "Rules on inventory models, predatory pricing and dark stores decide how aggressively platforms can compete.", "CCI quick commerce e-commerce FDI dark stores antitrust", "cci|antitrust|dark store|fdi|predatory"),
      d("consumer-spend", "Urban discretionary spending and income-tax relief", "demand", "Ministry of Finance", "Tax relief and wage growth change order frequency and ticket size.", "urban consumption discretionary spending income tax relief India", "consumption|discretionary|income tax|spending"),
    ],
  },
  {
    id: "retail-apparel",
    label: "Retail, apparel and jewellery",
    names: "\\b(titan|kalyan jewellers|senco|pc jeweller|thangamayil|page industries|raymond|aditya birla fashion|arvind|vedant|bata|relaxo|metro brands|campus|trent|go fashion|vmart|v-mart|baazar)",
    drivers: [
      d("gold-duty", "Gold import duty, gold price and hallmarking rules", "policy", "Ministry of Finance", "Duty cuts and price moves change jewellery demand, inventory gains and margins.", "gold import duty gold price jewellery demand hallmarking", "gold|import duty|hallmark|jewellery"),
      d("wedding-festive", "Wedding and festive demand", "demand", "Market data", "Seasonal spend swings quarterly results.", "wedding season festive demand India retail jewellery apparel", "wedding|festive|diwali|season"),
      GST("apparel and footwear", "GST apparel footwear rate", "gst"),
    ],
  },
  {
    id: "telecom",
    label: "Telecom",
    names: "\\b(bharti airtel|vodafone idea|reliance jio|tata communications|indus towers|tejas|hfcl|route mobile|railtel|sterlite tech|itI\\b|telephone|telecom|communications?|network|broadband|cable tv|fibre|fiber)",
    industries: ["Telecommunication"],
    drivers: [
      d("agr-spectrum", "AGR dues, spectrum pricing and licence fees", "regulation", "DoT", "Dues and spectrum costs decide cash flow and survival of the weakest operator.", "AGR dues spectrum auction price Vodafone Idea DoT", "agr|spectrum|licence fee|license fee|dues"),
      d("tariff-hike", "Mobile tariff increases and ARPU", "demand", "TRAI", "Tariff hikes lift revenue per user almost entirely to profit.", "mobile tariff hike ARPU Jio Airtel Vi TRAI", "tariff|arpu|recharge|price hike"),
      d("satcom", "Satellite broadband (satcom) spectrum allocation", "competition", "TRAI", "Administrative or auction allocation changes pricing and competition from global satellite players.", "satcom spectrum allocation Starlink TRAI DoT India", "satcom|starlink|satellite spectrum"),
    ],
  },
  {
    id: "power",
    label: "Power generation and distribution",
    names: "\\b(ntpc|power grid|tata power|adani power|jsw energy|nhpc|sjvn|torrent power|cesc|nlc india|power finance|rec ltd|irEDA|ireda|adani green|adani energy|suzlon|inox wind|waaree|premier energies|jsw neo|kpi green|sterling and wilson|power\\b|energy|electric power|hydro|thermal|transmission|powertech)",
    industries: ["Power"],
    drivers: [
      d("cerc-tariff", "CERC tariff orders and regulated returns", "regulation", "CERC", "Allowed return on equity and tariff true-ups decide earnings of regulated assets.", "CERC tariff order regulated return transmission generation", "cerc|tariff order|return on equity|true-up"),
      d("discom-dues", "State DISCOM dues and late-payment rules", "policy", "Ministry of Power", "Delayed payments from state utilities lock up working capital for generators and lenders.", "DISCOM dues late payment surcharge power generators", "discom|late payment|lps|dues|receivable"),
      d("coal-supply", "Coal supply, e-auction price and imported coal", "commodity", "Ministry of Coal", "Fuel availability and cost decide generation margins and the need for imported coal.", "coal supply stock power plants e-auction imported coal blending", "coal stock|e-auction|coal supply|imported coal"),
      d("power-demand", "Peak demand, heatwave and merchant power price", "demand", "Market data", "Demand spikes lift exchange prices and plant load factors.", "India peak power demand heatwave exchange price IEX", "peak demand|heatwave|iex|merchant"),
    ],
  },
  {
    id: "renewables",
    label: "Renewable energy and equipment",
    names: "\\b(adani green|suzlon|inox wind|waaree|premier energies|jsw neo|kpi green|acme solar|ntpc green|sjvn|ireda|borosil renewables|websol|olectra|genus power)",
    drivers: [
      d("solar-duty", "Duties and ALMM rules on solar cells and modules", "policy", "MNRE", "Import duty, domestic-content (ALMM) and anti-dumping rules decide who wins module and cell orders.", "ALMM solar cells import duty anti-dumping MNRE modules", "almm|solar|import duty|anti-dumping|cell"),
      d("auction-curtailment", "SECI tenders, PPAs and grid curtailment", "regulation", "MNRE", "Slow PPA signing and curtailment delay capacity and revenue.", "SECI auction PPA unsigned renewable curtailment transmission", "seci|ppa|curtailment|transmission|auction"),
      RATES,
    ],
  },
  {
    id: "oil-marketing",
    label: "Oil marketing and fuel retail",
    industries: ["Oil Gas & Consumable Fuels"],
    names: "\\b(indian oil|bharat petroleum|hindustan petroleum|bpcl|hpcl|iocl|mrpl|chennai petroleum)",
    drivers: [
      d("retail-fuel-price", "Retail petrol-diesel price freeze and excise duty", "policy", "PPAC", "When retail prices are held while crude rises, marketing margins shrink; excise changes shift the burden.", "petrol diesel price freeze excise duty OMC marketing margin", "petrol|diesel|excise|marketing margin|under-recovery"),
      d("lpg-subsidy", "LPG under-recovery and subsidy compensation", "policy", "Ministry of Finance", "Selling LPG below cost hits profit until the government compensates.", "LPG under-recovery compensation oil marketing companies", "lpg|under-recovery|compensation"),
      d("brent", "Brent crude", "commodity", "Market data", "Crude sets inventory gains, refining margins and under-recoveries.", "Brent crude oil price", "brent|crude"),
      d("russian-crude", "Russian crude discounts and sanctions", "policy", "Ministry of Commerce", "Cheap Russian barrels raise refining margins; sanctions risk can remove them.", "Russian crude imports India discount sanctions refiners", "russia|sanction|discount|urals"),
    ],
  },
  {
    id: "upstream-oil",
    label: "Oil and gas exploration",
    names: "\\b(oil & natural gas|ongc|oil india|vedanta oil|hindustan oil|selan)",
    drivers: [
      d("windfall", "Windfall tax and subsidy sharing", "policy", "Ministry of Finance", "Special levies on crude and subsidy burden reduce what producers keep from high prices.", "windfall tax crude oil producers ONGC subsidy sharing", "windfall|sad|subsidy sharing|cess"),
      d("gas-pricing", "APM gas price formula and new-well gas premium", "policy", "PPAC", "The government-set gas price formula decides revenue on a large share of production.", "APM gas price formula ONGC new well gas price PPAC", "apm|gas price|ceiling price|pricing formula"),
      d("brent", "Brent crude", "commodity", "Market data", "Realisation on every barrel follows crude.", "Brent crude oil price", "brent|crude"),
    ],
  },
  {
    id: "refining-petchem",
    label: "Refining and petrochemicals",
    names: "\\b(reliance industries|reliance ind|mangalore refinery|chennai petroleum|gujarat narmada|deepak|aarti|tata chemicals|gujarat alkalies|gnfc|finolex industries|supreme industries)",
    drivers: [
      d("grm", "Refining margins (GRM) and product cracks", "commodity", "Market data", "Gap between product and crude prices is the core profit driver of a refiner.", "refining margins GRM diesel crack spread Asia", "grm|refining margin|crack spread"),
      d("petchem-duty", "Petrochemical import duty and Chinese oversupply", "policy", "DGTR", "Duty on polymers and chemicals shields domestic prices from imports.", "petrochemical import duty polymer anti-dumping India", "polymer|polyethylene|pvc|duty|petrochemical"),
      d("russian-crude", "Russian crude discounts and sanctions", "policy", "Ministry of Commerce", "Cheap crude boosts margins; sanctions or export-market restrictions on products can reduce them.", "Russian crude India refiners sanctions product exports EU", "russia|sanction|discount"),
      USD,
    ],
  },
  {
    id: "city-gas",
    label: "City gas distribution and gas utilities",
    names: "\\b(indraprastha gas|mahanagar gas|gujarat gas|gail|petronet|adani total gas|gspl|gujarat state petronet|aegis logistics)",
    drivers: [
      d("apm-allocation", "APM gas allocation cuts to CNG and PNG", "policy", "PPAC", "Cheaper domestic gas allocation gets cut, forcing costlier spot LNG purchases and lowering margins.", "APM gas allocation cut CNG city gas distribution IGL MGL", "apm|allocation|cng|png|cgd"),
      d("pngrb-tariff", "PNGRB tariff and marketing exclusivity rules", "regulation", "PNGRB", "Pipeline tariff and exclusivity decisions set margins and competition.", "PNGRB tariff pipeline city gas exclusivity", "pngrb|tariff|pipeline|exclusivity"),
      d("lng-price", "LNG spot prices and long-term contract costs", "commodity", "Market data", "Imported LNG sets input cost; spikes squeeze margins until prices are raised.", "LNG spot price Asia JKM India gas utilities", "lng|jkm|spot|gas price"),
      USD,
    ],
  },
  {
    id: "coal",
    label: "Coal and mining",
    names: "\\b(coal india|nmdc|moil|gmdc|hindustan zinc|vedanta|sandur|lloyds metals)",
    drivers: [
      d("coal-eauction", "E-auction premium and coal royalty and pricing", "policy", "Ministry of Coal", "Realisations on auctioned coal and royalty rules set margin on incremental volumes.", "Coal India e-auction premium price royalty", "e-auction|premium|royalty|coal price"),
      d("power-demand", "Power demand and coal stocks at plants", "demand", "Ministry of Power", "Coal off-take follows thermal generation and utility stock levels.", "India coal demand power plants stock coal production", "coal stock|power demand|offtake|production"),
      d("coal-import", "Imported coal prices and blending mandates", "commodity", "Market data", "Costly imports encourage domestic coal use; a mandate or exemption moves volumes.", "imported coal prices blending mandate India", "imported coal|blending|newcastle"),
    ],
  },
  {
    id: "steel",
    label: "Steel",
    industries: ["Metals & Mining"],
    names: "\\b(tata steel|jsw steel|steel authority|sail|jindal steel|jindal stainless|apl apollo|ratnamani|welspun corp|lloyds|shyam metalics|godawari|kalyani steel|jsl|steels?|ispat|alloys?|iron|metal|tubes|strips|wire rods|foundr|sponge)",
    drivers: [
      d("safeguard", "Safeguard duty and anti-dumping on steel imports", "policy", "Ministry of Steel", "Duty on Chinese, Vietnamese and Korean steel protects domestic prices.", "steel safeguard duty anti-dumping imports India China", "safeguard|anti-dumping|steel import|duty"),
      d("coking-coal", "Coking coal and iron-ore prices", "commodity", "Market data", "Raw materials are the largest cost; spreads between steel and inputs set profit.", "coking coal iron ore price steel makers India", "coking coal|iron ore|nmdc|spread"),
      d("infra-demand", "Infrastructure and construction demand", "demand", "Ministry of Finance", "Government capex and real-estate activity drive steel consumption.", "India steel demand infrastructure construction consumption", "steel demand|consumption|infrastructure"),
      d("cbam", "EU carbon border tax (CBAM) on exports", "policy", "Ministry of Commerce", "The EU levy on carbon-intensive imports raises costs on steel and aluminium exported to Europe.", "EU CBAM carbon border tax India steel aluminium exports", "cbam|carbon border"),
    ],
  },
  {
    id: "non-ferrous",
    label: "Aluminium, copper and zinc",
    names: "\\b(hindalco|national aluminium|nalco|hindustan copper|hindustan zinc|vedanta|jindal aluminium)",
    drivers: [
      d("lme", "LME aluminium, copper and zinc prices", "commodity", "Market data", "Metal prices are the direct revenue driver; input cost is more sticky.", "LME aluminium copper zinc price", "lme|aluminium|copper|zinc"),
      d("china-demand", "China demand and supply curbs", "demand", "Market data", "Chinese output caps and property demand set global metal prices.", "China aluminium copper demand output cap", "china|output cap|demand"),
      d("cbam", "EU carbon border tax (CBAM)", "policy", "Ministry of Commerce", "Carbon cost on exports to Europe hits energy-intensive metals.", "EU CBAM carbon border tax aluminium India", "cbam|carbon border"),
      CHINA,
    ],
  },
  {
    id: "cement",
    label: "Cement and building materials",
    names: "\\b(ultratech|ambuja|acc ltd|shree cement|dalmia|jk cement|ramco cements|jk lakshmi|nuvoco|birla corp|india cements|heidelberg|star cement|prism johnson|kajaria|somany|cera|asian granito|century plyboards|greenply|astral|supreme|cements?|ceramics?|tiles?|granito|plywood|laminates|sanitary|bricks|glass|marble|granite|concrete|ready mix|decor)",
    industries: ["Construction Materials"],
    drivers: [
      d("fuel-cost", "Petcoke, coal and diesel costs", "commodity", "Market data", "Fuel and freight are around a third of cost; price swings drive margin.", "petcoke coal price cement makers cost freight", "petcoke|coal price|diesel|freight"),
      d("cement-demand", "Housing and infrastructure demand, monsoon impact", "demand", "Market data", "Volume follows construction activity; heavy rain delays dispatches.", "cement demand infrastructure housing monsoon prices dealers", "cement demand|price hike|dispatch|housing"),
      GST("cement", "GST on cement rate", "gst"),
      CAPEX,
    ],
  },
  {
    id: "capital-goods",
    label: "Capital goods, engineering and infrastructure",
    names: "\\b(larsen|l&t|siemens|abb india|bhel|bharat heavy|cummins|thermax|kec|kalpataru|hitachi energy|ge vernova|ge t&d|schneider|honeywell|polycab|kei industries|havells|crompton|apar|waaree|inox|bharat electronics|hindustan aeronautics|ircon|rvnl|irfc|titagarh|jupiter wagons|texmaco|ncc|ashoka|pnc|hg infra|gr infra|irb|sobha|dilip buildcon|afcons|grindwell|carborundum|elgi|kirloskar|lakshmi machine|ingersoll|skf|engineers|infra\\b|infrastructures?|projects?|constru|toll|engineering|pumps?|tools|cylinder|machine|metcast|forg|castings?|valves?|boilers?|cranes?|elevator|electricals?|transformers?|switchgear|cables?)",
    industries: ["Capital Goods", "Construction"],
    drivers: [
      CAPEX,
      d("order-inflow", "Order inflow, tenders and execution pace", "demand", "Market data", "Backlog converts to revenue over 2 to 3 years; new orders and delays are the leading indicator.", "order inflow tender wins order book capital goods India", "order inflow|order book|tender|bags order|wins order"),
      d("commodity-input", "Copper, aluminium and steel input prices", "commodity", "Market data", "Fixed-price contracts leave margins exposed to metals.", "copper aluminium steel price cables engineering margins", "copper|aluminium|steel price|input cost"),
      d("pli-localisation", "PLI schemes and local-content rules", "policy", "Ministry of Commerce", "Incentives and domestic-sourcing rules decide who gets orders and subsidies.", "PLI scheme domestic manufacturing local content India", "pli|local content|make in india"),
    ],
  },
  {
    id: "defence",
    label: "Defence and aerospace",
    names: "\\b(hindustan aeronautics|bharat electronics|mazagon|cochin shipyard|garden reach|bharat dynamics|bdl|solar industries|data patterns|astra microwave|paras defence|mtar|zen technologies|beml|bharat forge|hbl|apollo micro)",
    drivers: [
      d("dac", "Defence Acquisition Council approvals and procurement budget", "policy", "MoD", "Approvals and contract awards convert into the order books of Indian suppliers.", "Defence Acquisition Council approval procurement India MoD contract", "dac|defence acquisition|contract|procurement"),
      d("indigenisation", "Positive indigenisation lists and import bans", "policy", "MoD", "Banning imports of listed items reserves the market for Indian makers.", "positive indigenisation list defence import ban India", "indigenis|import ban|positive list"),
      d("defence-export", "Defence exports and geopolitical conflicts", "demand", "MoD", "Conflicts and export orders add demand for ammunition, missiles and platforms.", "India defence exports orders geopolitical", "export|geopolit|conflict|order"),
    ],
  },
  {
    id: "railways",
    label: "Railway suppliers and contractors",
    names: "\\b(irfc|rvnl|ircon|railtel|irctc|titagarh|jupiter wagons|texmaco|rites|kernex|container corp)",
    drivers: [
      d("rail-capex", "Railway capex and tender flow", "policy", "Ministry of Railways", "Budgeted capex, wagon and line orders feed contractors and suppliers.", "Indian Railways capex tender order wagons Vande Bharat", "railway|tender|wagon|vande bharat|capex"),
      d("kavach", "Safety mandates (Kavach) and fares", "regulation", "Ministry of Railways", "Safety systems create new product demand; fare and catering policy affect IRCTC.", "Kavach rollout railway safety tender fares", "kavach|safety|fare"),
    ],
  },
  {
    id: "realty",
    label: "Real estate",
    names: "\\b(dlf|godrej properties|oberoi|prestige|brigade|phoenix mills|macrotech|lodha|sobha|mahindra lifespace|signature global|puravankara|kolte|anant raj|raymond realty|sunteck|developers|spaces|estates?|realty|housing dev|properties|township|builders|land\\b|infra developers)",
    industries: ["Realty"],
    drivers: [
      RATES,
      d("rera-stamp", "RERA, stamp-duty and approval rules", "regulation", "RERA", "State rules on registration, stamp duty and project approvals set launches and cost.", "RERA stamp duty rule change real estate launches approvals", "rera|stamp duty|approval|fsi"),
      d("housing-demand", "Housing sales, inventory and price growth", "demand", "Market data", "Pre-sales and unsold inventory show if demand is keeping up with launches.", "housing sales launches inventory unsold Anarock PropEquity", "housing sales|inventory|launch|unsold"),
      d("input-cost", "Cement, steel and labour costs", "commodity", "Market data", "Construction costs squeeze developer margins when prices rise faster than home prices.", "construction cost cement steel prices real estate developers", "construction cost|cement|steel"),
    ],
  },
  {
    id: "chemicals",
    label: "Specialty and commodity chemicals",
    names: "\\b(pidilite|srf|upl|pi industries|navin fluorine|aarti|deepak nitrite|atul|vinati|tata chemicals|gujarat fluorochem|clean science|sumitomo|coromandel|chambal|sudarshan|fine organic|linde india|supreme petrochem|anupam|tatva|neogen|chem|amines|resins?|organics|adhesive|pesticides?|agrochem|dyes|pigments?|colou?rs|fluoro|polymers?|laboratories chem)",
    industries: ["Chemicals"],
    drivers: [
      CHINA,
      d("feedstock", "Crude, benzene and feedstock prices", "commodity", "Market data", "Feedstock moves cost faster than product prices are repriced.", "chemical makers feedstock crude benzene price margins India", "feedstock|benzene|crude|raw material"),
      d("reach-eu", "EU and US chemical regulation and supply-chain shifts", "regulation", "Ministry of Commerce", "China-plus-one orders and REACH or environmental rules decide export wins.", "China plus one specialty chemicals export orders REACH", "china plus one|reach|export order"),
      USD,
    ],
  },
  {
    id: "fertilizers-agri",
    label: "Fertilisers and agri inputs",
    names: "\\b(coromandel|chambal|rcf|national fertilizers|fact|gsfc|gnfc|paradeep|upl|pi industries|dhanuka|rallis|bayer|sumitomo|bharat rasayan|kaveri|nuziveedu|fertili[sz]ers?|agro\\b|agrotech|seeds|crop|bio-?tech agri|agri\\b)",
    drivers: [
      d("fert-subsidy", "Fertiliser subsidy (NBS) rates and payment timing", "policy", "Ministry of Agriculture", "Subsidy rates and delays set realisation and working capital.", "fertiliser subsidy NBS rates kharif DAP payments", "subsidy|nbs|dap|urea|fertiliser|fertilizer"),
      d("gas-ammonia", "Gas, ammonia and phosphoric-acid costs", "commodity", "Market data", "Imported inputs decide cost for non-urea makers.", "ammonia phosphoric acid DAP import price fertiliser makers", "ammonia|phosphoric|dap|gas price"),
      MONSOON,
    ],
  },
  {
    id: "sugar-ethanol",
    label: "Sugar and ethanol",
    names: "\\b(balrampur|triveni|dalmia bharat sugar|bannari|praj|ugar|eid parry|dhampur|avadh|magadh|shree renuka|sugars?|distiller|ethanol)",
    drivers: [
      d("ethanol", "Ethanol blending targets and procurement price", "policy", "Ministry of Agriculture", "Procurement price and feedstock rules set the profit split between sugar and ethanol.", "ethanol blending procurement price sugar mills grain cane", "ethanol|blending|procurement price"),
      d("sugar-policy", "Sugar export quota, FRP and minimum selling price", "policy", "Ministry of Agriculture", "Export permission, cane FRP and MSP decide realisations.", "sugar export quota FRP minimum selling price India", "sugar export|frp|msp|minimum selling price"),
      MONSOON,
    ],
  },
  {
    id: "aviation",
    label: "Airlines and airports",
    names: "\\b(interglobe|indigo|spicejet|gmr airports|gmr infra|adani airport|air india|taj gvk)",
    drivers: [
      d("atf", "Jet fuel (ATF) price and state taxes", "commodity", "PPAC", "Fuel is the top cost; monthly ATF revisions and VAT changes move profit.", "ATF jet fuel price airlines India state tax", "atf|jet fuel|fuel price|vat"),
      d("dgca", "DGCA safety rules, groundings and airport charges", "regulation", "DGCA", "Engine groundings, duty-hour norms and tariff orders change capacity and cost.", "DGCA rules aircraft grounded engine Pratt Whitney airport tariff AERA", "dgca|grounded|engine|aera|tariff"),
      d("airspace", "Airspace closures and international routes", "macro", "Ministry of Civil Aviation", "Closures lengthen routes and raise fuel cost and flight time.", "airspace closure Indian airlines rerouting Pakistan Middle East", "airspace|closure|reroute"),
      USD,
    ],
  },
  {
    id: "logistics-shipping",
    label: "Ports, shipping and logistics",
    names: "\\b(adani ports|jsw infrastructure|container corp|concor|great eastern shipping|shipping corp|delhivery|blue dart|mahindra logistics|tci|allcargo|gateway distriparks|vrl|transport corp|redington|snowman|aegis|container|shipping|logistic|transport|cargo|lines\\b|freight|port\\b|ports\\b|couriers?|warehous)",
    drivers: [
      d("freight", "Container and tanker freight rates (Red Sea, Hormuz)", "commodity", "Market data", "Route disruption lifts shipping rates, helping owners and hurting importers.", "container freight rates Red Sea shipping rates India exporters", "freight|red sea|hormuz|shipping rate|container"),
      d("exim", "India export-import volumes and trade policy", "demand", "Ministry of Commerce", "Cargo throughput follows trade and tariffs.", "India exports imports trade data tariffs cargo volumes", "export|import|trade deficit|tariff|cargo"),
      d("port-tariff", "Port tariff (TAMP) and freight-corridor rules", "regulation", "Ministry of Commerce", "Tariff authority orders and dedicated corridors shift volumes and margins.", "port tariff TAMP dedicated freight corridor", "tamp|tariff|freight corridor|dfc"),
    ],
  },
  {
    id: "consumer-durables",
    label: "Consumer durables and electronics",
    names: "\\b(dixon|voltas|blue star|whirlpool|havells|crompton|bajaj electricals|symphony|amber|kaynes|syrma|polycab|v-guard|orient electric|titan|relaxo|ttk|hawkins|butterfly|vip industries|safari|wires|cables|electric\\b|elect\\b|appliances?|lighting|lamps|fans\\b|batter|electronics|ems\\b)",
    industries: ["Consumer Durables"],
    drivers: [
      d("pli-electronics", "PLI, import duty on components and BIS norms", "policy", "Ministry of Commerce", "Incentives and component-duty changes decide contract-manufacturing margins.", "PLI electronics component import duty India Dixon BIS", "pli|import duty|bis|component"),
      d("summer-demand", "Summer demand for ACs, coolers and fans", "demand", "Market data", "A hot season lifts volumes in air-conditioners and fans; a cool one leaves inventory.", "air conditioner summer demand heatwave sales India", "air conditioner|ac sales|summer|heatwave"),
      d("metal-input", "Copper and aluminium prices", "commodity", "Market data", "Metals are the key input for appliances and wires.", "copper aluminium price appliances cost India", "copper|aluminium"),
      CHINA,
    ],
  },
  {
    id: "textiles",
    label: "Textiles and apparel exports",
    names: "\\b(kpr mill|welspun living|trident|vardhman|raymond|arvind|gokaldas|page industries|indo count|sutlej|alok|himatsingka|go fashion|spin|syntex|cotspin|hosiery|textile|mills\\b|fabrics?|yarn|garments?|denim|weav|knit|silk|apparels?|fashion)",
    industries: ["Textiles"],
    drivers: [
      d("us-tariffs", "US tariffs and trade-deal terms for apparel and home textiles", "policy", "US government", "Higher US duties on Indian goods shift orders to Bangladesh and Vietnam.", "US tariff India textiles apparel exports trade deal", "tariff|trade deal|export|duty"),
      d("cotton", "Cotton price, MSP and import duty", "commodity", "Ministry of Agriculture", "Cotton is the main raw material; duty and MSP changes affect cost.", "cotton price MSP import duty India textile mills", "cotton|msp|import duty"),
      d("fta", "India FTAs (UK, EU) and textile PLI", "policy", "Ministry of Commerce", "Duty-free access to new markets can lift export share.", "India UK EU free trade agreement textiles benefit", "fta|free trade|duty-free"),
    ],
  },
  {
    id: "media",
    label: "Media and entertainment",
    names: "\\b(zee|sun tv|pvr|inox leisure|network18|tv18|saregama|nazara|tips|hathway|den networks|dish tv|jagran|navneet|db corp|prime focus|telefilms?|digicontent|media|entertain|studios|films?|broadcast|cinema|publication|publishers|news)",
    industries: ["Media Entertainment & Publication"],
    drivers: [
      d("ad-spend", "Advertising spend and big sports events", "demand", "Market data", "Ad budgets track consumer demand and event calendars.", "India advertising spend growth IPL media outlook", "ad spend|advertising|ipl"),
      d("broadcast-rules", "Broadcasting, OTT and content regulation", "regulation", "Ministry of I&B", "Rules on pricing, content and carriage change distribution revenue.", "Broadcasting Services Bill OTT regulation TRAI tariff order", "broadcasting|ott|tariff order|content"),
      GST("cinema tickets", "GST on cinema tickets multiplex", "gst|ticket"),
    ],
  },
  {
    id: "hotels-travel",
    label: "Hotels, travel and leisure",
    industries: ["Consumer Services"],
    names: "\\b(indian hotels|taj|lemon tree|chalet|eih|oberoi|thomas cook|makemytrip|easy trip|ihcl|juniper|samhi|devyani|jubilant food|westlife|sapphire|barbeque|burger king|restaurant brands|hotels?|resorts?|foodworld|restaurants?|travel|tourism|holidays|leisure|inns?\\b|club|theme park)",
    drivers: [
      GST("hotel rooms and restaurants", "GST on hotel room tariff restaurants", "gst"),
      d("tourism", "Foreign arrivals, e-visa and domestic travel", "demand", "Ministry of Civil Aviation", "Visa and travel advisories change occupancy and room rates.", "foreign tourist arrivals India e-visa hotels occupancy ARR", "tourist|e-visa|occupancy|arr"),
      d("wedding-events", "Wedding and corporate event season", "demand", "Market data", "Seasonality decides banqueting and leisure revenue.", "wedding season hotels demand India", "wedding|banquet|season"),
    ],
  },
  {
    id: "agri-food",
    label: "Agri commodities and food processors",
    names: "\\b(adani wilmar|agro tech|tata consumer|kohinoor|lt foods|kri?bhco|krbl|usher|patanjali foods|jubilant ingrevia|avanti feeds|apex frozen|godrej agrovet|venky|foods?\\b|plantations?|tea\\b|dairy|poultry|rice|spices|oils?\\b|agro inds|aqua|seafood|marine products)",
    drivers: [
      d("export-policy", "Export bans, duties and MEP on rice, wheat, sugar, onion", "policy", "Ministry of Commerce", "Sudden trade curbs change volumes and prices overnight.", "export ban duty rice wheat onion MEP India agri", "export ban|duty|mep|rice|wheat"),
      MONSOON,
      d("edible-oil-duty", "Edible oil import duty", "policy", "Ministry of Finance", "Duty on crude oils changes refining margins.", "edible oil import duty change India", "edible oil|import duty|palm"),
    ],
  },
  {
    id: "paints",
    label: "Paints and coatings",
    names: "\\b(asian paints|berger|kansai nerolac|akzo nobel|indigo paints|grasim|birla opus|shalimar)",
    drivers: [
      d("paints-input", "Crude-linked raw materials (TiO2, monomers) and prices", "commodity", "Market data", "Raw material is the largest cost; price hikes lag input moves.", "paint raw material TiO2 crude price asian paints margins", "tio2|raw material|crude|price hike"),
      d("paints-competition", "New entrants and discount competition", "competition", "CCI", "Large new players spend on dealers and discounts, lowering industry margins.", "Birla Opus paint competition market share Asian Paints", "birla opus|market share|competition|discount"),
      d("housing-demand", "Housing and repaint demand", "demand", "Market data", "Real-estate activity and monsoon change volumes.", "housing demand repaint volume growth paint companies", "volume growth|repaint|housing"),
    ],
  },
  {
    id: "etf",
    label: "ETFs and index funds",
    names: "(\\betf\\b|\\bbees\\b|amc\\s*-|\\bnifty|\\bsensex|\\bliquid\\b|\\bgilt\\b|bond fund|mutual fund)",
    drivers: [
      d("etf-underlying", "The index, gold or silver the fund tracks", "macro", "Market data", "An ETF moves one-for-one with its underlying basket; check what the fund holds and how that market is trading.", "Nifty Sensex gold price silver price ETF inflows", "nifty|sensex|gold|silver|etf|index"),
      d("sebi-mf-rules", "SEBI mutual-fund and ETF rules", "regulation", "SEBI", "Rules on expense ratios, creation units and fund categories change cost and product availability.", "SEBI mutual fund ETF rules expense ratio new fund offer", "etf|mutual fund|expense ratio|nfo|fund"),
      d("etf-tax", "Capital-gains and STT treatment of funds", "policy", "Ministry of Finance", "Tax on fund units changes after-tax returns and flows.", "capital gains tax mutual fund ETF budget gold ETF taxation", "capital gains|tax|stt|ltcg|stcg"),
      d("gold-price", "Gold and silver prices", "commodity", "Market data", "Gold and silver ETFs track bullion; rate expectations and the dollar drive it.", "gold price silver price today India MCX", "gold|silver|bullion"),
    ],
  },
  {
    id: "packaging-plastics",
    label: "Packaging and plastics",
    names: "\\b(packag|plast|polymer|containers?|pet\\b|polyfab|flexi|laminat|film|pipes?|tubes?|moulding|molding|cans?\\b|glass|bottle)",
    drivers: [
      d("polymer-prices", "Polymer, resin and crude-linked raw material prices", "commodity", "Market data", "Plastic resin is the main input; margins widen when polymer prices fall faster than product prices and narrow in a spike.", "polymer prices PVC polyethylene polypropylene resin India crude", "polymer|pvc|polyethylene|polypropylene|resin|pet|crude"),
      d("plastic-rules", "Plastic-waste (EPR) and single-use plastic rules", "regulation", "Ministry of Finance", "Extended-producer-responsibility targets and bans raise compliance cost or open demand for recycled and compliant packaging.", "plastic waste EPR single use plastic ban India packaging rules CPCB", "epr|single-use|plastic waste|plastic ban|cpcb|packaging rules"),
      CHINA,
      d("client-demand", "Demand from FMCG, pharma and auto clients", "demand", "Market data", "Volumes follow end-user consumption and customers' destocking.", "FMCG demand packaging volumes India consumer demand", "volume|demand|packaging|consumer"),
    ],
  },
];

const GENERIC: BusinessLine = {
  id: "broad-market",
  label: "Broad market",
  drivers: [
    RATES,
    d("fii-flows", "Foreign investor flows", "macro", "Market data", "FPI buying or selling moves large caps and currency together.", "FPI FII flows India equities net buying selling", "fpi|fii|foreign investor|outflow|inflow"),
    d("budget-policy", "Budget, tax and policy changes", "policy", "Ministry of Finance", "Budget announcements and tax changes alter sector economics.", "India budget announcement tax change sectors impact", "budget|tax|announcement"),
  ],
};

/** Hand-picked mapping where the company name rules would mis-assign or miss. */
const OVERRIDES: Record<string, string[]> = {
  POLICYBZR: ["insurance-distribution", "payments-fintech", "nbfc"],
  PAYTM: ["payments-fintech", "nbfc"],
  RELIANCE: ["refining-petchem", "telecom", "consumer-internet"],
  ITC: ["fmcg", "alcohol-tobacco"],
  VEDL: ["non-ferrous", "upstream-oil", "coal"],
  HINDZINC: ["non-ferrous"],
  HDFCBANK: ["bank-private"],
  BAJFINANCE: ["credit-cards", "nbfc"],
  BAJAJFINSV: ["insurance-life", "nbfc"],
  JIOFIN: ["nbfc", "payments-fintech", "amc-broking"],
  TITAN: ["retail-apparel"],
  INDIGO: ["aviation"],
  LICI: ["insurance-life"],
  NIACL: ["insurance-general"],
  SBICARD: ["credit-cards"],
  SBILIFE: ["insurance-life"],
  HDFCLIFE: ["insurance-life"],
  ICICIPRULI: ["insurance-life"],
  ICICIGI: ["insurance-general"],
  STARHEALTH: ["insurance-general"],
  GODIGIT: ["insurance-general"],
  TATAMOTORS: ["auto-oem"],
  GRASIM: ["cement", "paints", "chemicals"],
  LT: ["capital-goods", "defence"],
  ADANIPORTS: ["logistics-shipping"],
  ADANIENT: ["capital-goods", "coal", "logistics-shipping"],
  ADANIGREEN: ["renewables", "power"],
  ADANIPOWER: ["power", "coal"],
  ADANIENSOL: ["power", "renewables"],
  IRCTC: ["railways", "hotels-travel"],
  BSE: ["exchange-depository"],
  MCX: ["exchange-depository"],
  CDSL: ["exchange-depository"],
  CAMS: ["amc-broking"],
  ETERNAL: ["consumer-internet"],
  ZOMATO: ["consumer-internet"],
  SWIGGY: ["consumer-internet"],
  NYKAA: ["consumer-internet"],
  DMART: ["consumer-internet", "retail-apparel"],
  // US big-tech: name rules and NSE industry labels miss these, so pin them to
  // it-services — the H-1B/visa, client IT budget, genAI and USD-INR drivers fit
  // these employers and AI players better than the generic broad-market line.
  ADBE: ["it-services"],
  AMZN: ["it-services"],
  CRM: ["it-services"],
  GOOG: ["it-services"],
  GOOGL: ["it-services"],
  IBM: ["it-services"],
  META: ["it-services"],
  MSFT: ["it-services"],
  NVDA: ["it-services"],
  ORCL: ["it-services"],
};

const BY_ID = new Map(BUSINESS_LINES.map((l) => [l.id, l]));
const COMPILED = BUSINESS_LINES.map((l) => ({ line: l, re: l.names ? new RegExp(l.names, "i") : null }));

/** Business lines for a stock, best match first (max 3). `industry` is the NSE industry label when known. */
export function linesFor(symbol: string, name: string, industry?: string | null): BusinessLine[] {
  const key = symbol.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const forced = OVERRIDES[key];
  if (forced) return forced.map((id) => BY_ID.get(id)).filter((l): l is BusinessLine => !!l).slice(0, 3);

  const scored = COMPILED.map(({ line, re }) => {
    let s = 0;
    const m = re?.exec(name);
    if (m) s += 3 + Math.min(m[0].length, 14) / 14; // a longer, more specific match wins ties
    if (industry && line.industries?.includes(industry)) s += 1;
    return { line, s };
  })
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s);
  let strong = scored.filter((x) => x.s >= 3);
  if (strong.some((x) => x.line.id === "bank-psu")) strong = strong.filter((x) => x.line.id !== "bank-private");
  const picked = (strong.length ? strong : scored).slice(0, strong.length ? 2 : 1).map((x) => x.line);
  return picked.length ? picked : [GENERIC];
}

/** All distinct drivers across the stock's lines, de-duplicated, in line order. */
export function driversFor(lines: BusinessLine[], max = 8): (Driver & { lineLabel: string })[] {
  const seen = new Set<string>();
  const out: (Driver & { lineLabel: string })[] = [];
  const depth = Math.max(...lines.map((l) => l.drivers.length));
  for (let i = 0; i < depth; i++) {
    for (const l of lines) {
      const dr = l.drivers[i];
      if (!dr || seen.has(dr.id)) continue;
      seen.add(dr.id);
      out.push({ ...dr, lineLabel: l.label });
    }
  }
  return out.slice(0, max);
}
