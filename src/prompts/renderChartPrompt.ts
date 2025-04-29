export const renderChartPrompt = `
### Required Structure
Every valid Vega-Lite specification MUST:

1. Be a top-level JSON object (not wrapped in a "spec" property)
2. Include at least one of: "mark", "layer", "facet", "hconcat", "vconcat", "concat", or "repeat"
3. Include a "data" property with the dataset
4. Include an "encoding" object that maps visual properties to data fields

### Data Types
Always specify the correct data type in encodings:
- "nominal" - for categories, names, and discrete values
- "quantitative" - for numbers and measurements
- "temporal" - for dates and times (must be in ISO format like "2025-04-01T05:00:00.000Z")
- "ordinal" - for ordered categories

### Common Charts
- Bar chart: \`"mark": "bar"\`
- Line chart: \`"mark": "line"\`
- Scatter plot: \`"mark": "point"\`
- Area chart: \`"mark": "area"\`
- Pie chart: Use \`"mark": "arc"\` with theta encoding

### Example: Bar Chart
"title": "Campaign Performance",
"data": {"values": [...]},
"mark": "bar",
"encoding": {
"x": {"field": "campaign_name", "type": "nominal", "axis": {"labelAngle": -45}},
"y": {"field": "clicks", "type": "quantitative", "axis": {"title": "Clicks"}},
"tooltip": [
{"field": "campaign_name", "type": "nominal"},
{"field": "clicks", "type": "quantitative"}
]
},
"width": 600,
"height": 400
}

### Example: Scatter Plot
{
"description": "A basic scatter plot example showing the relationship between two variables.",
  "width": 400,
  "height": 300,
  "data": {
    "values": [
      {"x": 10, "y": 20, "category": "A", "size": 5},
      {"x": 15, "y": 35, "category": "A", "size": 8},
      {"x": 20, "y": 25, "category": "B", "size": 12},
      {"x": 25, "y": 45, "category": "B", "size": 4},
    ]
  },
  "mark": "point",
  "encoding": {
    "x": {
      "field": "x", 
      "type": "quantitative",
      "title": "X-Axis Variable",
      "scale": {"zero": false}
    },
    "y": {
      "field": "y", 
      "type": "quantitative",
      "title": "Y-Axis Variable"
    },
    "size": {
      "field": "size", 
      "type": "quantitative",
      "title": "Size Variable"
    },
    "color": {
      "field": "category", 
      "type": "nominal",
      "title": "Category"
    },
    "tooltip": [
      {"field": "x", "type": "quantitative"},
      {"field": "y", "type": "quantitative"},
      {"field": "category", "type": "nominal"},
      {"field": "size", "type": "quantitative"}
    ]
  }
}


### Advanced Features
- For multiple series, use \`"color": {"field": "category"}\`
- To show uncertainty, add error bands with \`"mark": {"type": "errorband"}\`
- For small multiples, use \`"facet": {"field": "category"}\`

### Interactive Elements
- Add zoom: \`"selection": {"zoom": {"type": "interval", "bind": "scales"}}\`
- Add tooltips: \`"mark": {"type": "point", "tooltip": true}\`

### Common Errors to Avoid
- do not wrap the specification in a "spec" object
- Always specify data types in encoding (nominal, quantitative, etc.)
- Ensure temporal data is properly formatted as ISO date strings
- For bar charts, use \`"axis": {"labelAngle": -45}\` to prevent label overlap
- VERY IMPORTANT: think carefully about the chart type and the data you are using to create the chart to best display the data to the end user.

`
