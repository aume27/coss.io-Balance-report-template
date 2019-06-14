/**
 * Coss data pull functions
 *
 * Notes:
 *  - This script is using the GAS-coss-api-wrapper to pull private data.
 *  and the "Overall" getmarketsummaries from coss.io for price feed.
 *
 *
 *
 *
 *
 */
  var gecko_suppFiats =  [ //from coingecko.com as of December 16 2018
    "usd","aed","ars",
    "aud","bdt","bhd",
    "bmd","brl","cad",
    "chf","clp","cny",
    "czk","dkk","eur",
    "gbp","hkd","huf",
    "idr","ils","inr",
    "jpy","krw","kwd",
    "lkr","mmk","mxn",
    "myr","nok","nzd",
    "php","pkr","pln",
    "rub","sar","sek",
    "sgd","thb","try",
    "twd","vef","zar",
    "xdr","xag","xau"
  ];

//////////////////////////////////////////////////////////////////
//Coss related calls

//Set Api key
function getKeys(scriptId) {
  var sSecure = SpreadsheetApp.openById(scriptId),
      sss = sSecure.getSheetByName("Sheet1");
  Coss.apiKey = sss.getRange(1,1).getValue(); //Public key: first row first column
  Coss.apiSecret = sss.getRange(2,1).getValue();  //Private Key: second row
}


 // coss balances to  (Ss | array)
function accountBalanceArr(secP) {
  getKeys(SSSID);
  if (arguments.length > 1) {
    var res = Coss.accountBalance(arguments);
  } else {
    var res = Coss.accountBalance(secP);
  };
  // Logger.log(res);
  var arr = [];
  res.forEach(function(e){
    // Asset 	 Available 	 In Orders 	 Total
    arr.push([e.currency_code, e.available, e.in_order, e.total]); // e.address
  });
  return arr;
}

function marketPrices(symbol) {
  var res = Coss.marketPrice(symbol);
  return res
}

/**
 * ARRAYFORMULA wasnt working, made my own.
 * @customFunction
 */
function AFmarketPrices(tickers, baseCurrency) {
  
  tickers = typeof(tickers) == "string" ? [tickers] : tickers;
  tickers = tickers.join().split(","); //get1DArray
  baseCurrency = baseCurrency.toUpperCase();
  
  var ar = [];
  for (var i = 0; i < tickers.length; i++) {
    //if coin isnt a fiat or stable coin
    if (chkAbsence(tickers[i], db.fiatStables) && tickers[i].toUpperCase() !== "BTC") {
      
      //if coin is the Base currency
      if (tickers[i] == baseCurrency) {
        var price = 1;
        
        //If not base
        } else {
          
          var coin = Coss.marketPrice(tickers[i]+"_"+baseCurrency),
              price = coin[0].price;
        };
      
      //If coin is a stable coin
    } else {
      var coin = Coss.marketPrice(baseCurrency+"_"+tickers[i]),
          price = 1 / coin[0].price;
    };
    //Push base and fiat value to coss rec
    ar.push(price)
  }
//  Logger.log(ar)
  return ar;
}

//////////////////////////////////////////////////////////////////
//Coingekco related calls

/**
 * Coin gecko extraction function. Get data from:
 *            https://www.coingecko.com/api?locale=en
 * The key param work for metric contained in objects, not arrays.
 * Dependencies: myToFixed (), chkAbsence(), cgkoList(),
 *               error handlers vars, var gecko_suppFiats.
 * examples:
 *         cgkoExtV1("ethereum", bCurrency, bFiat);
 *         // → [1D Array];
 *         cgkoExtV1("komodo", bCurrency, bFiat, "community_data.facebook_likes");
 *         // → 16645;
 * @param {String} asset The Cryptocurrency to search for.
 * @param {String} bCurrency The base currency you desire. e.g. "btc"
 * @param {String} bFiat The fiat currency you desire. e.g. "usd"
 * @param {String} key The path to the metric you're searching. e.g. "community_data.facebook_likes"
 *
 * @return {Array | String} response object
 * @customFunction
 */
function cgkoExtV2( asset, bCurrency, bFiat, key){

  //asset undefined check
  if (!asset || typeof(asset) != "string") {
    Logger.log(errr + "\n Asset:   " + asset + "\n Object type:   " + typeof(asset));
    return [errr];
  };
  //Base and fiat convertor check
  switch(bCurrency) { case undefined: bCurrency = "btc"; break; };
  switch(bFiat) { case undefined: bFiat = "usd"; break; };

  //Handles if search is a fiat currency.
  if (chkAbsence(asset,gecko_suppFiats) == false) {
    //get coin gecko Id of base currency
    switch(bCurrency) {
      case "btc": var bGeckoId = "bitcoin"; break;
      case "eth": var bGeckoId = "ethereum"; break;
      default: var bGeckoId = srchByCmpr("symbol", "id", bCurrency, cgkoList(), gecko_suppFiats);
        break;
    }
    //get value of base currency in the searched fiat
    var res = cgkoExtV2(bGeckoId, "", "", "market_data.current_price."+ asset);

    if (res[0] == errr || res[0] == unav) {
      return [unav, "Unable to get base/tracked to calculate unit rate. Cause:  "+ res+"  . For: "+ asset];
    } else {
      //If request for one value
      if(key && key.indexOf("current_price") > -1) { return (res == 0 ? 0 : (1/ res)) };
      //as an array:
      //calculate value of 1 fiat unit on nase currency.
      res = res == 0 ? 0 : (1/ res);
      return [asset,"","", res, "value of 1"+ asset+ " /"+bCurrency];
    };
  };

  //Working coinGecko call and data
  var cgkoAstApi = UrlFetchApp.fetch("https://api.coingecko.com/api/v3/coins/"+ asset + "?tickers=false&developer_data=false",
                                     {'muteHttpExceptions': true});
  try { //eg: https://api.coingecko.com/api/v3/coins/bitcoin?localization=false

    var ast = JSON.parse(cgkoAstApi.getContentText());
    if (!ast) {
      Logger.log(unav + "\n Asset:   " + asset);
      return [unav];
    };
    var astMkt = ast['market_data'];

    if (!key) {
      //Handle if ICO metrics are available or not and base calculation
      var ico = {};
      if (ast['ico_data']) {
        var astIco = ast['ico_data'];
        if ( astIco.quote_public_sale_amount && astIco.base_public_sale_amount ) {
          //ternary trip ... Handle Ico end date to avoid errors
          var endDate = (astIco.ico_end_date == null || undefined) ? "Date missing" : astIco.ico_end_date;
          endDate = endDate != "Date missing" ? (endDate.indexOf("T") > -1 ? endDate.slice(0,endDate.indexOf("T")) : endDate):endDate;

          ico.end_date = endDate;
          ico.price = (Number(astIco.quote_public_sale_amount) / Number(astIco.base_public_sale_amount));
          ico.currency = astIco.quote_public_sale_currency.toLowerCase() || unav;
          ico.priceChange = ((astMkt.current_price[ico.currency] / ico.price -1)*100);
          ico.priceChange = myToFixed(ico.priceChange, 2);

        } else {
          ico.price = noIco;
          ico.currency = "---";
          ico.end_date = "---";
          ico.priceChange = "---";
        };
      } else {
        ico.price = noIco;
        ico.currency = "---";
        ico.end_date = "---";
        ico.priceChange = "---";
      };

      var extraCurr = bCurrency.toLowerCase() == "eth" ? "btc" : "eth";

      //Resorted in a simplified array combining both base and convertion metrics
      /*| 0.Ticker |1.mc_rank | 2.Fiat_value | 3.base_curr_value | 4.ETH_value | 5.Volume |
      6.Market_cap | 7.Circulating_sup. | 8.ICO public sale price | 9. Ico accepted currency |
      10. Ico price change | 11. Ico end (YYYY-MM-DD) | 12.All-time-high fiat | 13.fiat ATH % change |
      14. All-time-high base_curr	| 15.base_curr ATH % change | 16.%change 1D | 17.%change 1W |
      18.%change 1M | 19.Name | 20.links homepage | 21.Last updated |*/
      var cgkoArr = [
        ast.symbol,
        ast.market_cap_rank,
        astMkt.current_price[bFiat],
        astMkt.current_price[bCurrency],
        astMkt.current_price[extraCurr],
        astMkt.total_volume[bFiat],
        astMkt.market_cap[bFiat],
        astMkt.circulating_supply,
        ico.price,
        ico.currency,
        ico.priceChange,
        ico.end_date,
        astMkt.ath[bFiat],
        myToFixed(astMkt.ath_change_percentage[bFiat], 2),
        astMkt.ath[bCurrency],
        myToFixed(astMkt.ath_change_percentage[bCurrency], 2),
        myToFixed(astMkt.price_change_percentage_24h_in_currency[bFiat], 2),
        myToFixed(astMkt.price_change_percentage_7d_in_currency[bFiat], 2),
        myToFixed(astMkt.price_change_percentage_30d_in_currency[bFiat], 2),
        ast.id,
        ast.links.homepage[0],
        ast.last_updated
      ];

      return cgkoArr;
    } else {
      var ks = ast;
      var keyPath = key.split(".");
      //        Logger.log(keyPath);
      for (var i = 0; i < keyPath.length; i++) {
        var ks = ks[keyPath[i]];
      }
      return ks;
    };
  } catch (e) {
    Logger.log("Catching: "+e);
    Logger.log(cgkoAstApi.getResponseCode());
    Logger.log(cgkoAstApi.getHeaders());
    return [errr, "request failed", cgkoAstApi.getResponseCode()];
  };
}


 //quick and assume the api alway working
 function cgkoList() {
   try {
     var cgkoApi = UrlFetchApp.fetch("https://api.coingecko.com/api/v3/coins/list",
                                     {'muteHttpExceptions': true});
     var dt = JSON.parse(cgkoApi.getContentText());
     return dt;
   } catch(e) {
     Logger.log(e);
     return errr;
   };
 }

