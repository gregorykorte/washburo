import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

export const GET: APIRoute = async () => {
  const items = (await getCollection('dispatch'))
    .sort((a,b)=>+new Date(b.data.date)-+new Date(a.data.date))
    .slice(0,20);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel>
    <title>washburo</title>
    <link>https://washburo.com/</link>
    <description>Washington Bureau wires and dispatches</description>
    ${items.map(i=>`<item><title>${i.data.title}</title><link>https://washburo.com/dispatch/${i.slug}</link><pubDate>${new Date(i.data.date).toUTCString()}</pubDate></item>`).join('')}
  </channel></rss>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml' } });
}
