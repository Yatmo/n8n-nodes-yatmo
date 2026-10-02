# n8n-nodes-yatmo

Add real estate maps, points of interest and neighbourhood data to your n8n workflows.
`n8n-nodes-yatmo` is the official n8n community node for [Yatmo](https://yatmo.com): for any property, the
nearest schools, nurseries, supermarkets and public transport with real travel times, a written description of
the neighbourhood (as HTML, Markdown and plain text, ready for a listing page or a CRM), scores, flat listing
enrichment, geocoding, isochrones, routes and static map images, in 25 countries and 23 languages. No runtime
dependency.

Typical workflows: enrich every new listing from your CRM or portal feed with neighbourhood data; generate the
neighbourhood paragraph when a property is published; score a portfolio nightly; attach a map image to an email
or a PDF.

<p align="center">
  <img src="https://raw.githubusercontent.com/Yatmo/.github/main/profile/img/neighbourhood-text.png" width="720" alt="The Yatmo neighbourhood text on a property page">
</p>

## Install in 5 minutes

1. Get a Yatmo licence at [yatmo.com](https://yatmo.com); the node uses your **backend** key
   ([keys explained](https://documentation.yatmo.com/license)).
2. In n8n: **Settings > Community nodes > Install**, package name `n8n-nodes-yatmo` (or pick Yatmo in the nodes
   panel once the node is verified).
3. Add a **Yatmo** node, create the **Yatmo API** credential (backend key, country of your properties, default
   language), pick an operation and give it coordinates or an address.

## Operations

| Operation | Input | Output |
|---|---|---|
| Get Neighbourhood Summary | Coordinates or address | Nearest places by category with distances and travel times (walking, bicycling, driving, transit), closest cities, resolved address |
| Get Neighbourhood Text | Coordinates or address | `paragraphs` (title, sentences, items in the language), `html`, `markdown`, `plain`. Options: paragraphs to keep, heading level, headings naming the street and the city, the city only (discreet listing) or neither |
| Get Listing Enrichment | Coordinates or address | Flat JSON: the nearest place of each category with distance and time by four modes, to store and filter on |
| Get Scores | Coordinates or address | One 0 to 10 score per category |
| Geocode an Address | Address | Places with coordinates, best match first |
| Get Isochrones | Coordinates or address, travel mode | The 5, 10 and 20 minute areas as GeoJSON |
| Get Route | Two coordinates, travel mode | Distance, duration, geometry |
| Get Static Map | Coordinates or address, size, style, colour | A JPEG in the binary property (default `data`) |

The address of an item can be an expression (`{{ $json.address }}`); Yatmo locates it in the country of the
credential. The language option overrides the credential language per node. The node is usable as a tool by
AI agent nodes.

## Example: enrich a listing when it is created

1. Trigger: your CRM webhook (address, price, title).
2. **Yatmo: Get Neighbourhood Text**, location = Address, `{{ $json.address }}`, headings = city only.
3. **Yatmo: Get Listing Enrichment**, same address.
4. Update the listing in your CRM with `html` as the neighbourhood description and the enrichment fields
   (`categories[].nearest.walking.durationMinutes`...) as filters.

## Links

- [Yatmo](https://yatmo.com), [API documentation](https://documentation.yatmo.com/api), [OpenAPI description](https://documentation.yatmo.com/openapi.yaml)
- Other integrations: [WordPress](https://wordpress.org/plugins/yatmo-map/), [Odoo](https://apps.odoo.com/apps/modules/20.0/yatmo_map), [Drupal](https://www.drupal.org/project/yatmo_map), [npm packages](https://www.npmjs.com/org/yatmo), [MCP server for AI assistants](https://github.com/Yatmo/yatmo-mcp)

MIT licence. Yatmo is a paid service for real estate portals, agency networks and developers; a licence key is required.
