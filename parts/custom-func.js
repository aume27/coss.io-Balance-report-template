/*******************************************************************************
This file contain customFunction I made, feel free to copy them if you like what
you see.
*******************************************************************************/


/**
 * Search by comparing values from an array to a specified object property value
 *        in an array of objects.
 *        then return the values of a different property for the matching objects.
 * @param {string} keyPropStr Name of the property that is used as key for comparison.
 * @param {string} searchedPropStr Name of the property to extract values from objArr.
 *                                It is possible to retreive the entire object using
 *                                the string "wholeObject" instead of a propertyName.
 * @param {array} keyValArr Values for key Property used for comparison.
 * @param {array} objArr List of object to search in.
 * @param {array} excepArr List of value to avoid searching.
 * Example:
 *         var keyVals = [1, 2, 3, 4];
 *         var objArr = [{a: 1, b: 2,     c: "boo", d: "Hello " },
 *              {a: 2, b: 3,     c: 1,     d: "???"},
 *              {a: 3, b: "...", c: 2,     d: "world !" },
 *              {a: 4, b: "...", c: 2}];
 *         var excepArr = [2];
 *         srchByCmpr("a", "d", keyVals, objArr, excepArr);
 *
 *         // → [["Hello", "Success", 1],
 *                ["", "Exception", 2],
 *                ["world !", "Success", 3],
 *                ["", "Missing", 4, "Did not find any value in this object or property missing"]];
 *
 * @return {array} Values requested from the list of objects. Array values explained:
 *          0 = value researche, 1 = result indicator( Success, Exception, Missing), 
 *          2 = The key used in search, 3 = some more details on result
 * @customFunction
 */
function srchByCmpr(keyPropStr, searchedPropStr, keyValArr, objArr, excepArr) {
  
  function chkAbsence(value2check, array) { //Avoid dependencies.
    
    if(array == undefined) return true ;
    
    function checkInequal(a) { return a != value2check };
    res = array.every(checkInequal);
    return res;
  };
  
  var searchedValues = [];
  keyValArr = typeof(keyValArr) == "string" ? [keyValArr] : keyValArr;
  if (!Array.isArray(keyValArr)) { return [errr, 'keyValues not an array'] };
  if (!Array.isArray(objArr)) { return [errr, 'objArr not an array, must be an array of objects'] };
  keyValArr = keyValArr.join().split(","); //get1DArray
  
  for (var a = 0; a < keyValArr.length; a++) {
    if (searchedValues.length !== a) { searchedValues.push(["", "Missing", keyValArr[a-1]]) };
    
    if (chkAbsence(keyValArr[a].toLowerCase(), excepArr)) {
      
      for (var b = 0; b < objArr.length; b++) {
        
        if (objArr[b][keyPropStr] == keyValArr[a]) {
          if (searchedPropStr === "wholeObject") {
            searchedValues.push([objArr[b], "Success", keyValArr[a]]);
            break;
          } else {
            if (objArr[b][searchedPropStr] == null || objArr[b][searchedPropStr] == undefined) {
              searchedValues.push(["", "Missing", keyValArr[a], "Did not found value in this object or property's missing"]);
              break;
            } else {
              searchedValues.push([objArr[b][searchedPropStr], "Success", keyValArr[a]]);
              break;
            };
          };
        };
      }
    } else {
      searchedValues.push(["", "Exception", keyValArr[a], "In exception list"]);
    };
  }
  
  while (searchedValues.length < keyValArr.length) { searchedValues.push(["", "Missing", "On end check"]) };
  //Return
  return searchedValues;
}



/**
 * If checked elem DOES NOT match with any of the values
 * in the array return true.
 * @customFunction
 */
var chkAbsence = function(value2check, array) {
  if(array == undefined) return true ;

  function checkInequal(a) { return a != value2check };

  res = array.every(checkInequal);
  //  Logger.log("checkIfNoMatch:\n result: "+res);
  return res;
};


/**
 * Function to make sure rounding does not crash with toFixed().
 * Will only apply toFixed when possible else will return entry raw.
 */
function myToFixed(number, decimal) {
  if (number && (typeof(number) == "number" || typeof(number) == "string")) {
    return Number(number).toFixed(decimal);
  } else {
    return number;
  };
}


function myGetSum(array) {
  array = array.join().split(","); //get1DArray

  function add(total, value, index, array) {
    return Number(total) + Number(value);
  };

  var sum = array.reduce(add);

  return sum;
}
