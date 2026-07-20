# Normalized listing schema

Each record contains: stable `id`; `source`, `sourceListingId`, and canonical `sourceUrl`; `listingType`; `manufacturer`, `model`, `title`, and original `description`; nullable `{amount,currency}` price; structured location with `raw`, nullable city/region/country, and `isNorthAmerica`; nullable equipment details (`size`, `year`, `certification`, `certifiedWeightRangeKg`, `condition`, `color`, `hours`, `flights`, `porosity`, `inspectionDate`); seller name and public `profileUrl`; all full-size public listing `images`; nullable ISO `listedAt`; derived integer `listingAgeDays` as of retrieval; `firstSeenAt`, `lastSeenAt`, status, parse confidence, retrieval timestamp, raw record path, and content hash.

`listingType` is one of `full-kit`, `wing`, `harness`, `reserve`, `instrument`, `helmet`, or `other`. `bundle` records whether the source claims a full kit, detected components, the required core components (`wing`, `harness`, `reserve`), missing components, and whether that core set appears complete. Detection is evidence for comparison and not an airworthiness or compatibility assertion.

`cost` separates the item price from nullable shipping, tax, and inspection amounts. `knownTotal` is never presented as a guaranteed acquisition total; `overallCostComplete` and `warnings` make missing costs explicit. Generated kit scenarios use `knownItemSubtotal`, exclude unknown-location listings, and compare only matching currencies.

`listingAgeDays` is derived from the source's displayed calendar date and the UTC retrieval date. It is `null` when the source provides no reliable date. `sourceUrl`, `seller.profileUrl`, and every entry in `images` are absolute HTTP(S) URLs.

Required before persistence: stable internal ID, source, valid HTTP(S) source URL, retrieval timestamp, and either a non-empty title or meaningful description. Unknown optional values are `null`, never fabricated.
