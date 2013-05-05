(function() {

  // Global var to allow customization and multiple runs
  CSSRuleChecker = {};

  // percent is a number between 0 and 1
  CSSRuleChecker.percentil = function(percent, collection) {
    var result = null;
    if (collection.length > 0) {
      // Sort first to calculate median
      var sortedCollection = collection.sort(function(a,b) { return a - b; });
      var point = sortedCollection.length * percent;
      if ((point % 1) === 0) {
        // Exact match, so just return this value
        result = sortedCollection[point];
      } else {
        point = Math.floor(point);
        result = (sortedCollection[point] + sortedCollection[point + 1]) / 2;
      }
    }
    return result;
  }

  CSSRuleChecker.partial = function(func) {
    var args = Array.prototype.slice.call(arguments, 1);
    return function() {
      return func.apply(this, args.concat(Array.prototype.slice.call(arguments)));
    };
  }

  var percentil = CSSRuleChecker.percentil;
  var partial = CSSRuleChecker.partial;

  CSSRuleChecker.statistics = [
  {name: 'median', func: partial(percentil, 0.5)},
  {name: '95th percentil', func: partial(percentil, 0.95)},
  {name: 'average', func: average},
  {name: 'max', func: max}
  ];

  CSSRuleChecker.checkRules = function() {
    var stylesheets = document.styleSheets;
    var totalCount = 0;
    var totalAppliedCount = 0;
    var partsPerSelector = [];
    var selectorsPerRule = [];

    for ( var index = 0; stylesheets && index < stylesheets.length; ++index ){
      var currentStylesheet = stylesheets[index];
      var stylesheetName = "Inline Style";
      if (currentStylesheet.ownerNode.tagName.toLowerCase() === "link") {
        stylesheetName = currentStylesheet.href;
      }
      console.info("Stylesheet " + index + ": " + stylesheetName);
      var result = analyzeStylesheet(currentStylesheet );
      if (result) {
        totalAppliedCount += result.appliedSelectorCount;
        totalCount += result.totalSelectorCount;
        selectorsPerRule.push.apply(selectorsPerRule, result.selectorsPerRule);
        partsPerSelector.push.apply(partsPerSelector, result.partsPerSelector);
        console.log(result);
      }
    }

    console.info("There are " + totalCount + " rules");
    var notAppliedCount = totalCount - totalAppliedCount;
    console.info("Applied: " + totalAppliedCount + ", Not applied: " + notAppliedCount);

    for (var index = 0; index < CSSRuleChecker.statistics.length; ++index) {
      var statistic = CSSRuleChecker.statistics[index];
      getStatistic("selectorsPerRule " + statistic.name, selectorsPerRule, statistic.func);
      getStatistic("partsPerSelector " + statistic.name, partsPerSelector, statistic.func);
    }

  }

  // returns a tuple containing:
  // - appliedSelectorCount
  // - totalSelectorCount
  // - selectorsPerRule
  // - partsPerSelector
  function analyzeStylesheet(stylesheet) {
    var appliedCount = 0;
    var totalCount = 0;
    var selectorsPerRule = [];
    var partsPerSelector = [];

    if (!stylesheet) {
      return false;
    }

    var rules = stylesheet.rules;
    for ( var j = 0; rules && j < rules.length; ++j ){
      var currentRule = rules[j];

      // Skip other types of rules like media rules or fontface rules
      if (!((currentRule instanceof CSSImportRule) || currentRule instanceof CSSStyleRule)) {
        continue;
      }

      if ( currentRule instanceof CSSImportRule ) {
        var result = checkImportRule(currentRule);
        appliedCount += result.appliedSelectorCount;
        totalCount += result.totalSelectorCount;
        selectorsPerRule.push.apply(selectorsPerRule, result.selectorsPerRule);
        partsPerSelector.push.apply(partsPerSelector, result.partsPerSelector);

      } else {

        totalCount += 1;

        var selectorText = currentRule.selectorText;
        // Remove all pseudo classes, as some sizzle versions
        // break on them
        var pseudoRegex = /([^:])\:[\w\-]+(?:\(.*\))?([.\s>+\[#,]*?)/gi;
        var cleanSelectorText = selectorText.replace(pseudoRegex, function(match, g1, g2) {
          return g1 + g2;
        });
        var matchedElements = jQuery(cleanSelectorText);

        if ( matchedElements.length > 0 ){
          appliedCount += 1;
          //console.info(selectorText + " applies to " + matchedElements.length + " elements");
        } else {
          //console.warn(selectorText + " doesn't apply");
        }

        // Analyze rule composition
        if (selectorText != void 0 && selectorText != null) {
          var selectorsInRule = selectorText.split(',');
          selectorsPerRule.push(selectorsInRule.length);
          // This takes into account all possible ways to create a relationship between 2
          // selectors:
          // - spaces e.g: "parent children"
          // - '>' or '+' within spaces. e.g: "parent > children" "sibling + sibling
          // - attribute selector. e.g: "selector[attr="modifier"]
          // - status selector. e.g: "selector:status"
          var cssRegex = /\s+|\s*?[>+]\s*?|\[|\:/;
          for (var i in selectorsInRule) {
            // Remove first '.' cause it made difficult to parse rules right
            var selectorParts = selectorsInRule[i].split('.').filter(notEmpty).join(' ').split(cssRegex);
            partsPerSelector.push(selectorParts.length);
          }
        }

      }
    }

    return {
      appliedSelectorCount: appliedCount,
      totalSelectorCount: totalCount,
      selectorsPerRule: selectorsPerRule,
      partsPerSelector: partsPerSelector
    }
  }

  // Iterates over import rule, returning [appliedRuleCount, totalRuleCount] for that import.
  function checkImportRule( importRule ) {
    var stylesheet = importRule.styleSheet;
    return analyzeStylesheet(stylesheet);
  }

  function notEmpty(element) {
    return element !== '';
  }

  // algorithm must be a function that returns a number value
  function getStatistic(statName, collection, algorithm) {
    var result = algorithm(collection);
    console.log(statName, result);
  }

  function average(collection) {
    var average = 0;
    for (var index in collection) {
      average += collection[index];
    }
    return average / collection.length;
  }

  function max(collection) {
    var max = null;
    if (collection) {
      var sortedCollection = collection.sort(function(a,b) { return b - a; });
      max = collection[0];
    }
    return max;
  }

  // Load jQuery if it hasn't be previously loaded
  if (!window.jQuery) {
    script = document.createElement( 'script' );
    script.src = '//ajax.googleapis.com/ajax/libs/jquery/1/jquery.min.js';
    script.onload=CSSRuleChecker.checkRules;
    document.body.appendChild(script);
  }
  else {
    CSSRuleChecker.checkRules();
  }


})();
