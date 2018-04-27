#!/usr/bin/env node

"use strict";

var chalk = require("chalk");
var BigNumber = require("bignumber.js");
var getTime = require("./get-timestamp");
var setTimestamp = require("./set-timestamp");
var getRepTokens = require("./get-rep-tokens");
var doInitialReport = require("./do-initial-report");
var getPayoutNumerators = require("./get-payout-numerators");

function help() {
  console.log(chalk.red("This command will move time to the designate report time fram and do an initial-report"));
  console.log(chalk.red("FYI: Scalar markets outcome is the value between min and max, use market-info for details"));
}

/**
 * Move time to Market end time and do initial report
 */
function designateReport(augur, args, auth, callback) {
  if (args === "help" || args.opt.help) {
    help();
    return callback(null);
  }
  var amount = 10000;
  var marketId = args.opt.marketId;
  var userAuth = auth;
  var outcome = args.opt.outcome;
  var invalid = args.opt.invalid;
  getRepTokens(augur, amount, auth, function (err) {
    if (err) {
      console.log(chalk.red(err));
      return callback(err);
    }
    augur.markets.getMarketsInfo({ marketIds: [marketId] }, function (err, marketsInfo) {
      var market = marketsInfo[0];
      if (market.marketType === "scalar" && (new BigNumber(market.minPrice).gt(new BigNumber(outcome)))) {
        console.log(chalk.red("Scalar price is below min price"));
        callback("Error");
      }
      var marketPayload = { tx: { to: marketId } };
      // make sure we have the correct account to report with
      if (userAuth.address !== market.designatedReporter && auth.address === market.designatedReporter) {
        userAuth = auth;
      }
      augur.api.Market.getEndTime(marketPayload, function (err, endTime) {
        console.log(chalk.red.dim("Market End Time"), chalk.red(endTime));
        getTime(augur, auth, function (err, timeResult) {
          if (err) {
            console.log(chalk.red(err));
            return callback(err);
          }
          endTime = parseInt(endTime, 10) + 10000;
          setTimestamp(augur, endTime, timeResult.timeAddress, auth, function (err) {
            if (err) {
              console.log(chalk.red(err));
              return callback(err);
            }
            var payoutNumerators = getPayoutNumerators(market, outcome, invalid);
            doInitialReport(augur, marketId, payoutNumerators, invalid, userAuth, function (err) {
              if (err) {
                return callback("Initial Report Failed");
              }
              console.log(chalk.green("Initial Report Done"));
              callback(null);
            });
          });
        });
      });
    });
  });
}

module.exports = designateReport;
