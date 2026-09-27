import {
  findGroup,
  sectionLandingHref,
  type NavLink,
  type NavSection,
} from "@/lib/nav-columns";

export type PortalCrumb = { label: string; href: string };

export type PortalWayfinding = {
  back: PortalCrumb;
  crumbs: PortalCrumb[];
  current: string;
  groupFirstHref: string | null;
};

function sectionShortTitle(title: string) {
  if (title === "My Portfolio") return "Portfolio";
  if (title === "Data & Tools") return "Tools";
  return title;
}

function longestMatchingItem(group: { items: NavLink[] }, path: string): NavLink | null {
  let best: NavLink | null = null;
  for (const item of group.items) {
    if (item.external) continue;
    if (path === item.href || path.startsWith(`${item.href}/`)) {
      if (!best || item.href.length > best.href.length) best = item;
    }
  }
  return best;
}

/** Stable up-link + breadcrumb trail from nav registry (not browser history). */
export function buildPortalWayfinding(
  path: string,
  sections: NavSection[],
  hrefAllowed: (href: string) => boolean,
): PortalWayfinding | null {
  const normalized = path.split("?")[0] ?? path;
  if (normalized === "/Home") return null;

  const home: PortalCrumb = { label: "Home", href: "/Home" };
  const hit = findGroup(sections, normalized);

  if (!hit) {
    return {
      back: home,
      crumbs: [home],
      current: "This page",
      groupFirstHref: null,
    };
  }

  const sectionHref = sectionLandingHref(hit.section, hrefAllowed);
  const sectionCrumb: PortalCrumb = {
    label: sectionShortTitle(hit.section.title),
    href: sectionHref,
  };
  const item = longestMatchingItem(hit.group, normalized);
  const groupLead = hit.group.items.find((i) => !i.external && hrefAllowed(i.href));
  const groupHref = groupLead?.href ?? hit.href;
  const groupCrumb: PortalCrumb = { label: hit.group.label, href: groupHref };

  const backLabel =
    hit.section.title === "Today" ? "Home" : sectionShortTitle(hit.section.title);

  return {
    back: { label: backLabel, href: sectionHref },
    crumbs: [home, sectionCrumb, groupCrumb],
    current: item?.label ?? hit.group.label,
    groupFirstHref: groupHref,
  };
}
