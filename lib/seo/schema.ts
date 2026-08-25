import { ContentAsset } from "@/features/content/model/types";
import { slugify } from "@/features/asset/store/useAssetDetailStore";
import { stripHtmlTags as stripHtml } from "./seoUtils";

export function formatDurationISO(seconds: number): string {
  if (!seconds || isNaN(seconds)) return "PT1H30M0S";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `PT${hours}H${minutes}M${secs}S`;
}

export function buildOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "JOJO App",
    "url": "https://jojoapp.in",
    "logo": "https://jojoapp.in/logos/FAVICON.png",
    "sameAs": [
      "https://www.facebook.com/people/JOJO-APP/61585843836378/#",
      "https://www.instagram.com/jojoapp.in",
      "https://www.youtube.com/@JOJOPARJOJO",
      "https://in.linkedin.com/company/jojoapp"
    ]
  };
}

export function buildWebsiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "JOJO App",
    "url": "https://jojoapp.in",
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://jojoapp.in/search?q={search_term_string}",
      "query-input": "required name=search_term_string"
    }
  };
}

export function buildVideoOnDemandServiceSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "VideoOnDemandService",
    "name": "JOJO",
    "provider": {
      "@type": "Organization",
      "name": "JOJO App",
      "url": "https://jojoapp.in"
    },
    "areaServed": "IN"
  };
}

export function buildMovieSchema(asset: ContentAsset) {
  const imageUrl = asset.landscape?.url || asset.poster?.url || "";
  const slug = slugify(asset.title);
  const canonicalUrl = `https://jojoapp.in/${asset.assetType === "SHOW" ? "shows" : "movies"}/${slug}/${asset.assetId}`;

  return {
    "@context": "https://schema.org",
    "@type": "Movie",
    "name": asset.title,
    "description": stripHtml(asset.description),
    "image": imageUrl,
    "dateCreated": asset.releaseDate || undefined,
    "genre": asset.genres,
    "url": canonicalUrl,
    "inLanguage": "gu",
    "contentRating": asset.certification || undefined,
    "duration": formatDurationISO(asset.durationSeconds),
    "director": asset.directors.map((d) => ({
      "@type": "Person",
      "name": d.name,
      "image": d.image || undefined
    })),
    "actor": asset.professionals.map((a) => ({
      "@type": "Person",
      "name": a.name,
      "image": a.image || undefined,
      "jobTitle": a.role || "Actor"
    })),
    "potentialAction": {
      "@type": "WatchAction",
      "target": `https://jojoapp.in/watch/${asset.assetId}`,
      ...(asset.assetCategory === 'SVOD' ? {
        "actionAccessibilityRequirement": {
          "@type": "ActionAccessSpecification",
          "category": "subscription",
          "availabilityStarts": asset.releaseDate || "2024-01-01",
          "requiresSubscription": {
            "@type": "MediaSubscription",
            "name": "JOJO Premium"
          }
        }
      } : {})
    }
  };
}

export function buildVideoObjectSchema(asset: ContentAsset) {
  const imageUrl = asset.landscape?.url || asset.poster?.url || "";
  const slug = slugify(asset.title);
  const canonicalUrl = `https://jojoapp.in/${asset.assetType === "SHOW" ? "shows" : "movies"}/${slug}/${asset.assetId}`;

  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    "name": asset.title,
    "description": stripHtml(asset.description),
    "thumbnailUrl": [imageUrl],
    "uploadDate": asset.releaseDate ? (asset.releaseDate.includes('T') ? asset.releaseDate : `${asset.releaseDate}T00:00:00Z`) : "2024-01-01T00:00:00Z",
    "duration": formatDurationISO(asset.durationSeconds),
    "contentUrl": `https://jojoapp.in/watch/${asset.assetId}`,
    "embedUrl": `https://jojoapp.in/watch/${asset.assetId}`,
    "inLanguage": "gu",
    "interactionStatistic": {
      "@type": "InteractionCounter",
      "interactionType": { "@type": "WatchAction" }
    },
    "potentialAction": {
      "@type": "WatchAction",
      "target": `https://jojoapp.in/watch/${asset.assetId}`
    }
  };
}

export function buildTVSeriesSchema(asset: ContentAsset) {
  const imageUrl = asset.landscape?.url || asset.poster?.url || "";
  const slug = slugify(asset.title);
  const canonicalUrl = `https://jojoapp.in/shows/${slug}/${asset.assetId}`;

  return {
    "@context": "https://schema.org",
    "@type": "TVSeries",
    "name": asset.title,
    "description": stripHtml(asset.description),
    "image": imageUrl,
    "genre": asset.genres,
    "url": canonicalUrl,
    "inLanguage": "gu",
    "contentRating": asset.certification || undefined,
    "numberOfSeasons": asset.seasons?.length || 1,
    "actor": asset.professionals.map((a) => ({
      "@type": "Person",
      "name": a.name,
      "image": a.image || undefined,
      "jobTitle": a.role || "Actor"
    })),
    "containsSeason": asset.seasons.map((season) => ({
      "@type": "CreativeWorkSeason",
      "seasonNumber": season.seasonNumber,
      "name": season.title,
      "numberOfEpisodes": season.episodes?.length || 0,
      "episode": season.episodes?.map((episode) => ({
        "@type": "TVEpisode",
        "episodeNumber": episode.episodeNumber,
        "name": episode.title,
        "description": stripHtml(episode.description),
        "duration": formatDurationISO(episode.durationSeconds)
      }))
    })),
    "potentialAction": {
      "@type": "WatchAction",
      "target": `https://jojoapp.in/watch/${asset.assetId}`,
      ...(asset.assetCategory === 'SVOD' ? {
        "actionAccessibilityRequirement": {
          "@type": "ActionAccessSpecification",
          "category": "subscription",
          "availabilityStarts": asset.releaseDate || "2024-01-01",
          "requiresSubscription": {
            "@type": "MediaSubscription",
            "name": "JOJO Premium"
          }
        }
      } : {})
    }
  };
}

export function buildBreadcrumbSchema(items: { name: string; item: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": item.item
    }))
  };
}
