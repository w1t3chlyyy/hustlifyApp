DELETE FROM reviews WHERE product_id IN (
  '1f06e1c1-6e9b-4bff-9e41-92b8a45c3ad3',
  '4aa9b13f-7cbb-48f1-9663-19e01213683d',
  '7fbcd661-9934-441d-ac05-a3e6fef95e17',
  '2111c5af-a258-41be-864c-41b94f71df75',
  '3ade1866-76a4-48cc-8fc6-bd99601d0b8e',
  '9e4700b1-b80d-468d-be90-5bbcf8f51b5b',
  '753bae78-40d3-42bb-98b0-e003c93bec62',
  '03fe55f4-70a2-44cc-b7c1-93cb013c4b47',
  'b7a84f0c-6fe9-4e1f-a7eb-b2f63a8f68c7',
  'aea52ef0-0f88-4659-b6c4-35aaee9ecfe2',
  'fafdaa04-fabb-4d89-995e-24b002afe53b',
  'cba2f3e4-bc7d-4cb1-b822-817e0441d459'
);

DELETE FROM inventory_items WHERE product_id IN (
  '1f06e1c1-6e9b-4bff-9e41-92b8a45c3ad3',
  '4aa9b13f-7cbb-48f1-9663-19e01213683d',
  '7fbcd661-9934-441d-ac05-a3e6fef95e17',
  '2111c5af-a258-41be-864c-41b94f71df75',
  '3ade1866-76a4-48cc-8fc6-bd99601d0b8e',
  '9e4700b1-b80d-468d-be90-5bbcf8f51b5b',
  '753bae78-40d3-42bb-98b0-e003c93bec62',
  '03fe55f4-70a2-44cc-b7c1-93cb013c4b47',
  'b7a84f0c-6fe9-4e1f-a7eb-b2f63a8f68c7',
  'aea52ef0-0f88-4659-b6c4-35aaee9ecfe2',
  'fafdaa04-fabb-4d89-995e-24b002afe53b',
  'cba2f3e4-bc7d-4cb1-b822-817e0441d459'
);

DELETE FROM products WHERE id IN (
  '1f06e1c1-6e9b-4bff-9e41-92b8a45c3ad3',
  '4aa9b13f-7cbb-48f1-9663-19e01213683d',
  '7fbcd661-9934-441d-ac05-a3e6fef95e17',
  '2111c5af-a258-41be-864c-41b94f71df75',
  '3ade1866-76a4-48cc-8fc6-bd99601d0b8e',
  '9e4700b1-b80d-468d-be90-5bbcf8f51b5b',
  '753bae78-40d3-42bb-98b0-e003c93bec62',
  '03fe55f4-70a2-44cc-b7c1-93cb013c4b47',
  'b7a84f0c-6fe9-4e1f-a7eb-b2f63a8f68c7',
  'aea52ef0-0f88-4659-b6c4-35aaee9ecfe2',
  'fafdaa04-fabb-4d89-995e-24b002afe53b',
  'cba2f3e4-bc7d-4cb1-b822-817e0441d459'
);

DELETE FROM categories WHERE id IN ('gaming', 'streaming', 'software', 'social', 'vpn', 'ai', 'design');