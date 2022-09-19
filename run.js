'use strict';

const {BigQuery} = require('@google-cloud/bigquery');
const https = require('https');
const fs = require('fs');

var apiConfig = "config.json"
var datasetId = 'mev_relayer_data';
var tableId = 'blocks';
var dataQueryIntervalInMs = 10000; // 10 secs
var dataApis;

// Load API endpoints and latest processed slot number from config
loadApiConfig();

function loadApiConfig() {
  try {
    const apiConfigData = fs.readFileSync(apiConfig, 'utf8');
    dataApis = JSON.parse(apiConfigData);
  } catch (err) {
    console.error(err);
  }
}

function updateApiConfig() {
  try {
    fs.writeFileSync(apiConfig, JSON.stringify(dataApis));
  } catch (err) {
    console.error(err);
  }
}

// Regularly queries each relayer data API and stores the data in BigQuery
async function main() {
  const bigquery = new BigQuery();

  setInterval(function () {
    console.log(`${new Date().toISOString()} - Checking for relayer updates...`);
    dataApis.forEach( async(dataApi) => {
      var prevSlotNumber = dataApi.min_slot_number;
      try {
        var blocks = await getBlocksFromRelayer(dataApi);
        if (blocks.length > 0) {
          console.log(`Found ${blocks.length} new blocks from ${dataApi.relay_operator}-${dataApi.relay_name} relayer`);
          await storeBlockRecord(bigquery, blocks);
          // Successfully stored, update config with latest block
          updateApiConfig();
        }
      }
      catch(e) {
        console.log(JSON.stringify(e));
        // revert slot number
        dataApi.min_slot_number = prevSlotNumber;
      }
    });
  }, dataQueryIntervalInMs);
}

// In case of reorgs there could be multiple bids per slot.
async function getBlocksFromRelayer(dataApi) {
  var dataPath = `/relay/v1/data/bidtraces/proposer_payload_delivered?limit=100`;
  var url = dataApi.relay_url + dataPath;
     
    return new Promise ((resolve, reject) => {
      var jsonResult = '';
      var req = https.get(url, function(res) {
          res.setEncoding('utf8');
          res.on('data', function (chunk) {
            jsonResult += chunk;
          });
            
          res.on('end', function () {
              try {
                var parsedBlocks = JSON.parse(jsonResult);
                var unstoredBlocks = [];
                var greatest_slot = dataApi.min_slot_number;
                parsedBlocks.forEach(block => {
                  block.relay_operator = dataApi.relay_operator;
                  block.relay_name = dataApi.relay_name;
                  block.timestamp = new Date().toISOString();
                  if (block.slot > dataApi.min_slot_number) {
                    unstoredBlocks.push(block);
                    if (Number.parseInt(block.slot) > greatest_slot) {
                      greatest_slot = Number.parseInt(block.slot);
                    }
                  }
                })
                dataApi.min_slot_number = greatest_slot;
                resolve(unstoredBlocks);
             }
             catch(e) {              
              console.log(JSON.stringify(e));
              console.log("Unable to parse response from server " + jsonResult);
              reject(e)
             }
          });
      });
      
      req.on('error', function(e) {
          console.log(e.message);
          reject(e)
      });
      req.end();
  });
}

async function storeBlockRecord(bigquery, blocks) {

  // Insert data into a table
  await bigquery
    .dataset(datasetId)
    .table(tableId)
    .insert(blocks);
  console.log(`Inserted ${blocks.length} rows`);
}

async function getLatestSlotFromBeacon() {
  return new Promise ((resolve, reject) => {
      var req = https.get(beaconApiServer + beaconHeaderApiPath, function(res) {
          res.setEncoding('utf8');
          res.on('data', function (chunk) {
              var body = JSON.parse(chunk);
              var latestSlot = Number.parseInt(body.data[0].header.message.slot);
              resolve(latestSlot);
          });
      });
      
      req.on('error', function(e) {
          console.log(e.message);
          reject(e)
      });
      req.end();
  });
}

main();