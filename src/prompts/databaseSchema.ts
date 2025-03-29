export const databaseSchemaDescription = `The data in the database is from april 29 2024 to may 31 2024. If the user asks a question that doesnt make sense in terms of the time, remind them of this. Perform a sql query against the database. Here's the schema. make inferences on what tables to query based on the table names and the user's request and most importantly refer to the schema to ensure you dont use headers that don't exist: Database Schema
Tables and Relationships

campaign_analytics

campaign_name VARCHAR(255),
variant_name VARCHAR(255),
tags VARCHAR(255),
subject VARCHAR(255),
list VARCHAR(255),
send_time TIMESTAMP,
send_weekday VARCHAR(50),
total_recipients FLOAT,
unique_placed_order FLOAT,
placed_order_rate VARCHAR(50),
revenue DECIMAL(15,2),
unique_opens FLOAT,
open_rate VARCHAR(50),
total_opens FLOAT,
unique_clicks FLOAT,
click_rate VARCHAR(50),
total_clicks FLOAT,
unsubscribes FLOAT,
spam_complaints FLOAT,
spam_complaints_rate VARCHAR(50),
succesful_deliveries FLOAT,
bounces FLOAT,
bounce_rate VARCHAR(50),
campaign_ID VARCHAR(100),
campaign_channel VARCHAR(50),
winning_variant CHAR(1)`