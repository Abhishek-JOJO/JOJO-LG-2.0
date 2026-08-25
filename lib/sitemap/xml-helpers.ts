export function escapeXml(unsafe: string): string {
  if (!unsafe) return '';
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

export interface VideoSitemapMetaData {
  /** High-res landscape thumbnail URL */
  thumbnail_loc: string;
  /** Video title */
  title: string;
  /** Video synopsis/description */
  description: string;
  /** Direct watch/player URL */
  player_loc?: string;
  /** Duration in seconds */
  duration?: number;
  /** Publication date (ISO string) */
  publication_date?: string;
  /** SVOD/TVOD subscription requirement */
  requires_subscription?: "yes" | "no";
  /** Family friendly flag */
  family_friendly?: "yes" | "no";
}

export interface ImageMeta {
  loc: string;
}

export interface SitemapUrl {
  loc: string;
  lastmod: string;
  changefreq?: string;
  priority?: number;
  image_loc?: string;
  images?: ImageMeta[];
  video?: VideoSitemapMetaData;
}

export function generateSitemapIndex(urls: { loc: string; lastmod: string }[]): string {
  const sitemaps = urls.map(
    url => `  <sitemap>\n    <loc>${escapeXml(url.loc)}</loc>\n    <lastmod>${url.lastmod}</lastmod>\n  </sitemap>`
  ).join('\n\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps}
</sitemapindex>`;
}

export function generateUrlSet(urls: SitemapUrl[]): string {
  const urlNodes = urls.map((url) => {
    let node = `  <url>\n    <loc>${escapeXml(url.loc)}</loc>\n    <lastmod>${url.lastmod}</lastmod>`;

    if (url.changefreq) node += `\n    <changefreq>${url.changefreq}</changefreq>`;
    if (url.priority !== undefined) node += `\n    <priority>${url.priority}</priority>`;

    // Render image extensions without duplicates
    const imageLocs = new Set<string>();
    if (url.image_loc) imageLocs.add(url.image_loc);
    if (Array.isArray(url.images)) {
      url.images.forEach((img) => img?.loc && imageLocs.add(img.loc));
    }
    imageLocs.forEach((loc) => {
      node += `\n    <image:image>\n      <image:loc>${escapeXml(loc)}</image:loc>\n    </image:image>`;
    });

    // Render Google Video Extension if required tags exist
    if (url.video && url.video.title && url.video.thumbnail_loc) {
      const v = url.video;
      node += `\n    <video:video>`;
      node += `\n      <video:thumbnail_loc>${escapeXml(v.thumbnail_loc)}</video:thumbnail_loc>`;
      const safeTitle = v.title.replace(/\]\]>/g, ']]&gt;');
      const safeDesc = v.description ? v.description.replace(/\]\]>/g, ']]&gt;') : '';

      node += `\n      <video:title><![CDATA[${safeTitle}]]></video:title>`;
      
      if (safeDesc) {
        node += `\n      <video:description><![CDATA[${safeDesc}]]></video:description>`;
      }
      if (v.player_loc) {
        node += `\n      <video:player_loc>${escapeXml(v.player_loc)}</video:player_loc>`;
      }
      if (v.duration && v.duration > 0) {
        node += `\n      <video:duration>${Math.round(v.duration)}</video:duration>`;
      }
      if (v.publication_date) {
        node += `\n      <video:publication_date>${escapeXml(v.publication_date)}</video:publication_date>`;
      }
      if (v.requires_subscription) {
        node += `\n      <video:requires_subscription>${v.requires_subscription}</video:requires_subscription>`;
      }
      if (v.family_friendly) {
        node += `\n      <video:family_friendly>${v.family_friendly}</video:family_friendly>`;
      }
      node += `\n    </video:video>`;
    }

    node += `\n  </url>`;
    return node;
  }).join('\n\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urlNodes}
</urlset>`;
}

