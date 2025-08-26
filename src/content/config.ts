import { defineCollection, z } from 'astro:content';

const dispatch = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    dek: z.string().optional(),
    city: z.string().default('WASHINGTON'),
    byline: z.string().default('By Staff'),
    date: z.string(),
  }),
});

const briefs = defineCollection({
  type: 'data',
  schema: z.object({
    hed: z.string(),
    lede: z.string(),
    timestamp: z.string(),
    source: z.string().optional()
  })
});

export const collections = { dispatch, briefs };
