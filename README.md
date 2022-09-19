The public dataset produced by this script is [available here](https://console.cloud.google.com/bigquery?project=ethereumdataanalytics&ws=!1m5!1m4!4m3!1sethereumdataanalytics!2smev_relayer_data!3sblocks).

You may also set up this script to push data to your own dataset by following these instructions:

1. Install npm & [gcloud](https://cloud.google.com/sdk/docs/install)
2. Clone this repo locally
3. Create a Google cloud project
4. In BigQuery, create a new dataset `mev_relayer_data` and table `blocks`
The `blocks` table should have the following schema:
```
relay_operator	STRING	NULLABLE			
relay_name	STRING	NULLABLE			
timestamp	TIMESTAMP	NULLABLE			
Timestamp of insertion	
slot	BIGNUMERIC	NULLABLE			
parent_hash	STRING	NULLABLE			
block_hash	STRING	NULLABLE			
builder_pubkey	STRING	NULLABLE			
proposer_pubkey	STRING	NULLABLE			
proposer_fee_recipient	STRING	NULLABLE			
gas_limit	BIGNUMERIC	NULLABLE			
gas_used	BIGNUMERIC	NULLABLE			
value	BIGNUMERIC	NULLABLE
```
5. Login with gcloud `gcloud init`, login and select your project
6. Install dependencies `npm i`
7. Run the script `node run.js`

