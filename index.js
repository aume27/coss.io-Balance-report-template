/**
 * Title: CELT performance report - V5
 * @customFunction
 *
 * Creadits:
 *   Made using:
 *    Clasp (google version control software)
 *    Atom editor
 * Bound spreadsheet: https://docs.google.com/spreadsheets/d/1h1cmp_hmLCXwb-E1upP060M6mUkctklw-5Tz9oPv5XA/edit#gid=2123907513
 * Notes:
 *  The reportig functions don't use dynamic ranges to interact with Spreadsheet (ss)
 *    the overview uses them. in Ss, in namedRanges list ranges starting with
 *    fix_ (are not dynamic), suf_ (are dynamic), rng_ (are dynamic)
 */

//  Spreadsheets and sheets map
var ss = SpreadsheetApp.getActive(),
    sht1 = ss.getSheetByName("Set n Manage"),
    sht2 = ss.getSheetByName("Overview"),
    sht3 = ss.getSheetByName("Temp_rep"),
    SSSID = ""; //secure spreadsheet Id (Where API keys are)

// Ranges map (doesnt include fix_ ranges, only dynamic) if = "": range called at the moment its used
var rm = {
  //Set n Manage sheet
  fiatStables: sht1.getRange("suf_setm_coss_fiatStables").getValue(),
  // Overview
  ov_reps: {
    box: "",
    traking: sht1.getRange("suf_ov_reps_tracking").getValue(),
    eht_eq: ""
  },
  an: {
    box:"",
    delta: ""
  },
  nrep: {
    hodlList: sht1.getRange("suf_rep_holdings_list").getValue()
  }
};

// data base
var db = {
  autoRep: sht1.getRange("fix_autoRep").getValue(), // auto-report switchOnOff
  timeZ: sht1.getRange("fix_time_zone").getValue(), // time zone
  baseCur: sht1.getRange("fix_baseCurr").getValue(), // base-currency
  fiatCvt: sht1.getRange("fix_fiatCvt").getValue(), // fiat convertor
  fiatStables: sht1.getRange(rm.fiatStables).getValues().join().split(","),
  toFind: [], //Coins to work with.
  coss: {
    rec: []
  },
  lrep: { //Last report
    name: sht2.getRange("fix_qv_lastRep_name").getValue(), // name
    fnd: sht2.getRange("fix_qv_lastRep_etheq").getValue(), // last report eth equivalant
  },
  nrep: {
    name: ""
  },
};

// Error handlers
var errr = "undefined_error: - ",
    unav = "Unavailable",
    noIco = "No ico data avbl.",
    logz = Utilities.formatDate(new Date(),db.timeZ, "dd-MM'_'HH:mm") +
            " New log:\n"; //concat log msg(allow for log emailing and ease log reading).


function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Report management')
      .addItem('1. Create empty report sheet', 'createReportSheet')
      .addItem('2. Process actual report', 'processActualReport')
      .addItem('3. Insert report in Overview', 'updateOverview')
      .addSeparator()
      .addItem('Generate a complete report', 'generateFullReport')
      .addItem('Full process', 'fullProcess1')
      .addSeparator()
      .addItem('Refesh rates', 'refresh')
    .addToUi();
}


function refresh() {
  SpreadsheetApp.getActiveSpreadsheet()
  .getSheetByName("Set n Manage")
  .getRange("fix_refresh_trig").setValue(Math.random());
}

/////////////////////////////////////////////////////////////////////////////////////////////////
//Reporting related functions

function autoReports() {
  if (db.autoRep.toLowerCase() === "on") {
    fullProcess1();
    send_log_to_man(logz);
  } else {
    return 0;
  };
}


function fullProcess1() {
  updateOverview(processActualReport(createReportSheet()));
}


function generateFullReport() {
  processActualReport(createReportSheet());
  Logger.log(logz);
}


// Create new report (nrep)
function createReportSheet() {

  sht3.activate();
  var nrep = ss.duplicateActiveSheet().activate();
  //set date

  var date = Utilities.formatDate(new Date(),db.timeZ, "dd/MM/yyyy'_'HH:mm");
  var formattedDate = date.split("_");
  var formaDate = formattedDate[0];
  //Set properties of new report (name, date).
  db.nrep.name = formaDate+"REP"+(formattedDate[1].split(':'))[0];
  nrep.getRange("rep_gen_date").setValue(date+' '+db.timeZ);

  nrep.setName(db.nrep.name);
  logz = log_build(logz,'New report created. \nName: '+ db.nrep.name + '.    Date: '+ date);
  return db.nrep.name;
};


function processActualReport(repSheetName) {
  var sheet1 = !repSheetName ? ss.getActiveSheet() : ss.getSheetByName(repSheetName);
  repSheetName = sheet1.getSheetName();
  logz = log_build(logz, 'Start processing '+repSheetName+' report:');

  db.coss.rec = accountBalanceArr("ign0");
  logz = log_build(logz, 'Succesfully pulled balances');
  //Get coins in account indexes
  db.coss.rec.forEach( function(coin) {
    db.toFind.push(coin[0]);
  });

  //Get coins market prices
  var res = marketPrices();
  if (!res) {
    logz = log_build(logz, 'Couldnt reach coss.io server, Market-price call failed.');
    db.coss.rec.push(unav, '','Couldnt reach coss.io server, Market-price call failed.');

  } else {

    db.baseFiatVal = srchByCmpr("symbol", "price", db.baseCur.toUpperCase()+"_"+db.fiatCvt.toUpperCase(), res);

    for (var i = 0; i < db.toFind.length; i++) {
      //if coin isnt a fiat or stable coin
      if (chkAbsence(db.toFind[i], db.fiatStables) && db.toFind[i] !== "BTC") {
        //{"symbol":"OMG_XRP","price":"3.7093","updated_time":1546570108810}
        //if coin is the Base currency
        if (db.toFind[i] == db.baseCur.toUpperCase()) {
          var price = [[1]],
              baseEq = db.coss.rec[i][3];
        //If not base
        } else {
          var price = srchByCmpr("symbol", "price", db.toFind[i]+"_"+db.baseCur.toUpperCase(), res),
              baseEq = Number(db.coss.rec[i][3]) * Number(price[0][0]);
        };
      //If coin is a stable coin
      } else {
        var price = srchByCmpr("symbol", "price", db.baseCur.toUpperCase()+"_"+db.toFind[i], res);
        price[0][0] = 1/ price[0][0];
        var baseEq = Number(db.coss.rec[i][3]) * Number(price[0][0]);
      };
      //Calculate equivalants:
      var fiatEq = baseEq * db.baseFiatVal[0][0];
      //Push base and fiat value to coss rec

      db.coss.rec[i].push(price[0][0], baseEq, fiatEq);
    }
  };

  // Set values to new report (last report eth equivalant, balances and values)
      // Fudings values
  sheet1.getRange('rep_coss_calc').getCell(1, 1).setValue(db.lrep.fnd);
      //Append data to report.
  for (var row in db.coss.rec) {
    if (db.coss.rec[row][0] == "CELT") continue;
    sheet1.appendRow(db.coss.rec[row]);
  };
  logz = log_build(logz, "Processed report. here's a raw logs of used data.\n"+
                   "For coss records(coss.rec), the headers are:\n"+
                   " Asset | Available | In Orders | Total | ethrate | Total equivalant in ETH | Tot.equiv in USD \n"+
                   JSON.stringify(db));
  return repSheetName;
}



function updateOverview(repSheetName) {
  // report sheet
  var sheet1 = !repSheetName ? ss.getActiveSheet() : ss.getSheetByName(repSheetName);
  repSheetName = sheet1.getSheetName();
  //Insert new report column
  sht2.insertColumnsAfter(sht2.getRange("A1:1").getLastColumn()-1, 1);

  //Overview ranges
  rm.ov_reps.eth_eq = sht1.getRange("suf_ov_reps_eth_eq").getValue();
  var repsEtheq = sht2.getRange(rm.ov_reps.eth_eq);
  //Analise box:
  rm.an.box =  sht1.getRange("suf_an_box").getValue();
  rm.an.delta = sht1.getRange("suf_an_delta").getValue();
  var anBox = sht2.getRange(rm.an.box);
  //Delta formula(frm) to copie paste
  var anDelta = sht2.getRange(rm.an.delta) //.getCell(1, sht2.getLastColumn() -2)

  //Update Overview coin ticker list:
    //Get arrays to compare
  var hodlList = sheet1.getRange(rm.nrep.hodlList);
  db.toFind = hodlList.offset(1,0,hodlList.getNumRows()-1 ,1).getValues().join().split(',');

    //Check if overvier tracked all coins of new reports
  for (var i = 0; i < db.toFind.length; i++) {
    db.ovTracked = sht2.getRange(rm.ov_reps.traking).getValues().join().split(',');
    if(chkAbsence(db.toFind[i], db.ovTracked)) {
      var values = [];
      while (values.length < hodlList.getLastColumn()) { values.push("") };
      values.push(db.toFind[i]);
      sht2.appendRow(values);
    };
  }

  //get data and element to insert in overview
  var ele = [
    // 1 Push report data
    // 2 Vlookup Formula of reports baseEq
  ];

  ele.push(sheet1.getRange("rep_coss_calc").getCell(1,1).offset(1,0,4,1).getValues());
  ele[0].push([""]) //place holder for Delta frm
  ele[0].push([repSheetName]);
  ele.push("=ArrayFormula(if(len(INDIRECT(rng_ov_reps_tracking)),vlookup(INDIRECT(rng_ov_reps_tracking),INDIRECT(\""+repSheetName
           +"\"&\"!\"&suf_rep_holdings_list),match(\"Total equivalent in ETH\",INDIRECT(\""+repSheetName+"\"&\"!\"&suf_rep_holdings_head),0),0),))");

  //send report to overview
  //Analises
  anBox.getCell(2,anBox.getNumColumns()-1).offset(0, 0, anBox.getNumRows()-1, 1).setValues(ele[0]);
  anDelta.getCell(1, anDelta.getNumColumns()-2).copyTo(anDelta.getCell(1, anDelta.getNumColumns()-1), SpreadsheetApp.CopyPasteType.PASTE_NORMAL);
  //Reports Eth eq table, set formula.
  repsEtheq.getCell(1, repsEtheq.getNumColumns()-1).setValue(ele[1]);


  refresh();
  sht2.activate();
  //Log
  logz = log_build(logz, "Data transfered to overview: "+
                   "\n Last report eth equivalant: "+ele[0][0]+
                   "\n Balances equivalent in eth: "+ele[0][1]+
                   "\n P/L: "+ele[0][2]+
                   "\n %change: "+ele[0][3]+
                   "\n Balance equivalent in USD: "+ ele[0][4]);

  logz = log_build(logz, "Overview updated, data base raw final:\n "+
                   JSON.stringify(db));
  Logger.log(logz);
};
