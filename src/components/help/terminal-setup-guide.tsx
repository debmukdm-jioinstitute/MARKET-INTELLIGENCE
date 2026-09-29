"use client";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const MI_URL = "https://getmarketintelligence.in/cli/mi.mjs";

function Code({ children }: { children: string }) {
  return (
    <pre className="my-3 overflow-x-auto rounded-lg border border-border bg-muted/60 p-4 text-xs leading-relaxed">
      <code>{children}</code>
    </pre>
  );
}

function SetupStep({
  n,
  title,
  body,
  code,
  expect,
}: {
  n: number;
  title: string;
  body: string;
  code?: string;
  expect?: string;
}) {
  return (
    <div className="mb-5 rounded-lg border border-border/80 bg-card/50 p-4 last:mb-0">
      <p className="text-sm font-bold text-foreground">
        Step {n}. {title}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
      {code ? <Code>{code}</Code> : null}
      {expect ? (
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          <span className="font-semibold text-foreground">What you should see: </span>
          {expect}
        </p>
      ) : null}
    </div>
  );
}

function MacWalkthrough() {
  return (
    <div className="space-y-1 pt-2">
      <SetupStep
        n={1}
        title="Install Node.js (runs the mi menu)"
        body="mi is a small script that needs Node on your Mac. Go to https://nodejs.org in your browser, click the green LTS button for macOS, open the downloaded .pkg file, and click through the installer (defaults are fine)."
        expect="Node installs without errors; you do not need to open Node from Applications — we use it from Terminal next."
      />
      <SetupStep
        n={2}
        title="Open Terminal"
        body="Press Command+Space, type Terminal, press Enter. A window with a prompt like yourname@MacBook ~ % appears — that is where you paste the commands below."
      />
      <SetupStep
        n={3}
        title="Confirm Node is installed"
        body="Copy this line, paste into Terminal, press Enter:"
        code="node -v"
        expect="A line like v20.19.0 or v22.x (any v18 or higher is OK). If you see “command not found”, quit Terminal, reopen it, and try again; if it still fails, re-run the Node installer."
      />
      <SetupStep
        n={4}
        title="Create a folder for the mi command"
        body="We store mi in a personal tools folder (creates the folder if missing):"
        code="mkdir -p ~/.local/bin"
        expect="No output usually means success."
      />
      <SetupStep
        n={5}
        title="Download mi from Market Intelligence"
        body="This fetches the latest menu script (~800 KB) into that folder:"
        code={`curl -fsSL ${MI_URL} -o ~/.local/bin/mi`}
        expect="Silent success, or a progress bar from curl. If curl fails, check your internet connection."
      />
      <SetupStep
        n={6}
        title="Allow macOS to run the script"
        body="Mark the file as executable:"
        code="chmod +x ~/.local/bin/mi"
        expect="No output is normal."
      />
      <SetupStep
        n={7}
        title="Teach the shell where mi lives (PATH)"
        body="So you can type mi instead of the full path. macOS uses zsh by default — run both lines:"
        code={`echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc`}
        expect="The second line returns you to a prompt with no error."
      />
      <SetupStep
        n={8}
        title="Start the Market Intelligence menu"
        body="Run:"
        code="mi"
        expect="A banner, live status line, and shortcuts (Enter = snapshot, M = browse all tools). Press Q to quit."
      />
      <SetupStep
        n={9}
        title="Optional — portfolio login"
        body="Public market data needs no password. For your holdings on the site, use the same email and password as getmarketintelligence.in:"
        code="mi login YOUR_EMAIL YOUR_PASSWORD"
        expect="A success message; then try mi get_my_portfolio or use the interactive menu."
      />
    </div>
  );
}

function WindowsWalkthrough() {
  return (
    <div className="space-y-1 pt-2">
      <p className="mb-4 text-sm text-muted-foreground">
        Follow every step in order. Use <b className="text-foreground">Windows Terminal</b> or{" "}
        <b className="text-foreground">PowerShell</b> (blue window) — not Command Prompt unless noted.
      </p>
      <SetupStep
        n={1}
        title="Install Node.js"
        body="Open https://nodejs.org in Edge or Chrome. Download the LTS Windows Installer (.msi). Run it, accept the license, and keep “Add to PATH” checked on the setup screen, then Finish."
        expect="Setup completes; you may need to close any open PowerShell windows after this."
      />
      <SetupStep
        n={2}
        title="Open PowerShell"
        body="Click Start, type PowerShell, open Windows PowerShell or Terminal. If you just installed Node, close this window and open a fresh one."
      />
      <SetupStep
        n={3}
        title="Check Node works"
        body="Paste and press Enter:"
        code="node -v"
        expect="v20.x or v22.x (18+). If you see “node is not recognized”, restart the PC once and repeat Step 2–3."
      />
      <SetupStep
        n={4}
        title="Create a folder for mi on your PC"
        body="This makes a hidden folder .mi in your user profile (e.g. C:\\Users\\YourName\\.mi). Nothing is there yet — we download mi next:"
        code="mkdir $HOME\\.mi -Force"
        expect="PowerShell may print the path of the new directory, or nothing — both OK."
      />
      <SetupStep
        n={5}
        title="Download the mi script"
        body="Windows 10/11 includes curl. This saves mi.mjs into that folder:"
        code={`curl.exe -fsSL ${MI_URL} -o $HOME\\.mi\\mi.mjs`}
        expect="Download completes; you can check with: dir $HOME\\.mi and see mi.mjs listed."
      />
      <SetupStep
        n={6}
        title="Run mi for the first time (easiest way)"
        body="You do not need a shortcut yet — call Node on the file directly:"
        code="node $HOME\\.mi\\mi.mjs"
        expect="The Market Intelligence menu appears. Use this same command anytime, or complete Steps 7–9 to type just mi."
      />
      <SetupStep
        n={7}
        title="Optional — create a mi shortcut file"
        body="Only if you want to type mi from any folder. Creates a small launcher in .local\\bin:"
        code={`mkdir $HOME\\.local\\bin -Force
@'
@echo off
node "%USERPROFILE%\\.mi\\mi.mjs" %*
'@ | Set-Content -Path "$HOME\\.local\\bin\\mi.cmd" -Encoding ASCII`}
        expect="No error; Test-Path $HOME\\.local\\bin\\mi.cmd returns True."
      />
      <SetupStep
        n={8}
        title="Optional — add the shortcut folder to PATH"
        body="Start menu → search “Environment Variables” → Open “Edit environment variables for your account” → under User variables select Path → Edit → New → paste exactly: %USERPROFILE%\\.local\\bin → OK on every dialog. Open a new PowerShell window."
        expect="In the new window, typing mi launches the menu (Step 9)."
      />
      <SetupStep
        n={9}
        title="Run mi (after PATH) or keep using node …"
        body="If you added PATH:"
        code="mi"
        expect="Same menu as Step 6. To update the script later: mi update (or node …\\mi.mjs update)."
      />
      <SetupStep
        n={10}
        title="Optional — portfolio login"
        body="Same email/password as the website:"
        code="mi login YOUR_EMAIL YOUR_PASSWORD"
        expect="Confirmation message; then mi get_my_portfolio works."
      />
    </div>
  );
}

function LinuxWalkthrough() {
  return (
    <div className="space-y-1 pt-2">
      <SetupStep
        n={1}
        title="Install Node.js 18+ and curl"
        body="Example on Ubuntu/Debian: sudo apt update && sudo apt install -y curl nodejs npm. Fedora: sudo dnf install -y curl nodejs. If node -v shows below v18, install LTS from https://nodejs.org instead of apt."
        expect="Package install finishes without errors."
      />
      <SetupStep
        n={2}
        title="Verify Node"
        body="Open a terminal and run:"
        code="node -v"
        expect="v18.0.0 or higher."
      />
      <SetupStep
        n={3}
        title="Create a folder for mi"
        body="Personal command directory (standard on Linux):"
        code="mkdir -p ~/.local/bin"
        expect="No output is normal."
      />
      <SetupStep
        n={4}
        title="Download mi"
        body="Fetch the script from Market Intelligence:"
        code={`curl -fsSL ${MI_URL} -o ~/.local/bin/mi`}
        expect="curl completes; ls ~/.local/bin/mi shows the file."
      />
      <SetupStep
        n={5}
        title="Make mi executable"
        body="Required on Linux so the shell can run the file:"
        code="chmod +x ~/.local/bin/mi"
      />
      <SetupStep
        n={6}
        title="Add ~/.local/bin to PATH"
        body="For bash (use ~/.zshrc instead if your shell is zsh):"
        code={`echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc`}
        expect="New prompt with no error."
      />
      <SetupStep
        n={7}
        title="Launch the menu"
        code="mi"
        expect="Market Intelligence banner and keyboard shortcuts."
      />
      <SetupStep
        n={8}
        title="Optional — portfolio login"
        code="mi login YOUR_EMAIL YOUR_PASSWORD"
        expect="Same credentials as the website."
      />
    </div>
  );
}

export function TerminalSetupGuide() {
  return (
    <div className="space-y-4 text-sm text-muted-foreground">
      <p>
        <b className="font-semibold text-foreground">mi</b> is a free text menu for India market data (same feeds as this
        site). First-time setup: install Node.js, download one script, run it. No Market Intelligence app install. No API
        key for public menus.
      </p>

      <Accordion type="single" collapsible className="rounded-lg border border-border px-3">
        <AccordionItem value="how-to-setup" id="terminal-setup">
          <AccordionTrigger className="text-sm font-semibold text-foreground hover:no-underline">
            How to set up in terminal
          </AccordionTrigger>
          <AccordionContent>
            <p className="mb-4 text-sm leading-relaxed">
              Choose your operating system. Each walkthrough is numbered — do not skip steps. You start with{" "}
              <b className="text-foreground">no mi files</b> on your machine.
            </p>
            <Accordion type="single" collapsible className="space-y-1 border-t border-border pt-2">
              <AccordionItem value="setup-mac">
                <AccordionTrigger className="text-sm font-semibold text-foreground">
                  Mac — full walkthrough
                </AccordionTrigger>
                <AccordionContent>
                  <MacWalkthrough />
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="setup-windows">
                <AccordionTrigger className="text-sm font-semibold text-foreground">
                  Windows — full walkthrough
                </AccordionTrigger>
                <AccordionContent>
                  <WindowsWalkthrough />
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="setup-linux">
                <AccordionTrigger className="text-sm font-semibold text-foreground">
                  Linux — full walkthrough
                </AccordionTrigger>
                <AccordionContent>
                  <LinuxWalkthrough />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <p className="text-xs font-bold uppercase tracking-wider text-foreground">After setup</p>
        <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
          {[
            ["mi", "Interactive menu"],
            ["mi snapshot", "Market snapshot"],
            ["mi stress", "Stress index"],
            ["mi brief", "Daily brief"],
            ["mi tools", "List all tools"],
          ].map(([cmd, desc]) => (
            <li key={cmd}>
              <code className="font-semibold text-foreground">{cmd}</code> — {desc}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
