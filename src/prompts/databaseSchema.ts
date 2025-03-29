export const databaseSchemaDescription = `The data in the database is from april 29 2024 to may 31 2024. If the user asks a question that doesnt make sense in terms of the time, remind them of this. Perform a sql query against the database. Here's the schema. make inferences on what tables to query based on the table names and the user's request: Database Schema
Tables and Relationships
clients

id: Unique identifier for each client
name: Client's name (required)
created_at: When the client was added to the system
status: Client's status (default: 'active')

call_transcripts

id: Unique identifier for each call transcript
client_id: References the client this call belongs to
timestamp: When the call occurred
transcript: Full text of the call (required)
status: Transcript status (default: 'success')

emails

id: Unique identifier for each email
client_id: References the client this email belongs to
timestamp: When the email was sent/received
subject: Email subject line
body: Full email content
status: Email status (default: 'success')

shopify_reports

id: Unique identifier for each Shopify report
client_id: References the client this report belongs to
timestamp: When the report was generated
report_type: Category/type of Shopify report
data: JSON data containing the report content
status: Report status (default: 'success')

klaviyo_reports

id: Unique identifier for each Klaviyo report
client_id: References the client this report belongs to
timestamp: When the report was generated
report_type: Category/type of Klaviyo report
data: JSON data containing the report content
status: Report status (default: 'success')

campaign_analytics

campaign_name
variant_name
tags
subject
list
send_time
send_weekday
total_recipients
unique_placed_order
placed_order_rate
revenue
unique_opens
open_rate
total_opens
unique_clicks
click_rate
total_clicks
unsubscribes
spam_complaints
spam_complaints_rate
succesful_deliveries
bounces
bounce_rate
campaign_ID
campaign_channel
winning_variant


Current Clients

Peak Performance Gym (ID: 1047)
EcoGoods Store (ID: 2891)
TechTrend Innovations (ID: 5732)
Bloom Floral Co (ID: 9123)
Urban Eats Catering (ID: 3678) - inactive
Skyline Realty (ID: 7501)`;
