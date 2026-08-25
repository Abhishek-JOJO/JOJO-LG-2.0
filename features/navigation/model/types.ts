/**
 * Navigation Types and Response Mapper
 */

import { REGEX } from "@/lib/constants/regex";
import { ROUTES } from "@/lib/constants/routes";

export interface ApiNavigationItem {
  subnav_id: number;
  image: string;
  subnav_name: string;
  name_analytics: string;
  child_navigation_list: ApiNavigationItem[];
}

export interface NavigationItem {
  subnav_id: number;
  title: string;
  url: string;
}

/**
 * Maps a subnav name dynamically to client-side URLs
 */
export function getUrlForSubnav(name: string): string {
  const normalized = name.toLowerCase().trim();
  switch (normalized) {
    case "home":
      return ROUTES.HOME;
    case "movies":
      return ROUTES.MOVIES;
    case "shows":
      return ROUTES.SHOWS;
    case "natak":
    case "nataks":
      return ROUTES.NATAK;
    case "kids":
    case "kidz":
      return ROUTES.KIDS;
    case "search":
      return ROUTES.SEARCH;
    case "watchlist":
      return ROUTES.WATCHLIST;
    case "profile":
      return ROUTES.PROFILE;
    case "hot & new":
    case "hot and new":
    case "hotnnew":
      return ROUTES.HOT_AND_NEW;
    default:
      // Fallback: convert name to a URL-friendly slug
      return `/${normalized
        .replace(REGEX.NON_ALPHANUMERIC_REGEX, "-")
        .replace(REGEX.TRIM_HYPHENS_REGEX, "")}`;
  }
}

/**
 * Safely maps hierarchical API response with parent-child relationships to NavigationItem array.
 * Extracts "Home" and its sub-categories ("Movies", "Shows", "Natak", "Kidz")
 * as well as other content menus (e.g. "Hot & New"), while filtering out utilities ("Search", "Profile").
 */
export function mapNavigationResponse(response: any): NavigationItem[] {
  if (!response) return [];

  // Unwrap from data envelope if present
  const data = response.data !== undefined ? response.data : response;
  if (!data) return [];

  const rawList = data.navigation_list || (Array.isArray(data) ? data : []);
  if (!Array.isArray(rawList)) return [];

  const result: NavigationItem[] = [];

  rawList.forEach((item: any) => {
    if (!item || typeof item !== "object") return;

    const name = item.subnav_name || "";
    const analyticsName = item.name_analytics || name;
    const analyticsNameLower = analyticsName.toLowerCase().trim();


    if (analyticsNameLower === "home") {
      // 1. Add Home itself to the navigation links list
      result.push({
        subnav_id: Number(item?.subnav_id) || 0,
        title: name,
        url: getUrlForSubnav(analyticsName),
      });

      // 2. Add children of Home (e.g., Movies, Shows, Natak, Kidz)
      const navigation_list_menu = item.child_navigation_list;
      if (Array.isArray(navigation_list_menu)) {
        navigation_list_menu.forEach((child: any) => {
          if (!child || typeof child !== "object") return;
          const childName = child?.subnav_name || "";
          const childAnalyticsName = child?.name_analytics || childName;
          if (childName) {
            result.push({
              subnav_id: Number(child?.subnav_id) || 0,
              title: childName,
              url: getUrlForSubnav(childAnalyticsName),
            });
          }
        });
      }
    } else {
      // Add other category root items (e.g., "Hot & New")
      result.push({
        subnav_id: Number(item?.subnav_id) || 0,
        title: name,
        url: getUrlForSubnav(analyticsName),
      });
    }
  });

  return result;
}
