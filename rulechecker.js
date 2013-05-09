(function(){

  // Global var to allow customization and multiple runs
  CSSRuleChecker = window.CSSRuleChecker || {};

  // percent is a number between 0 and 1
  CSSRuleChecker.percentil = function(percent, collection) {
    var result = [];
    // First for selectorsInRule
    // Sort first to calculate median
    var selectorsInRuleCount = _.map(collection, function(rule) { return rule.parts.length; });
    var partsInSelectorCount = _.reduce(collection, function(previous, current) {
      previous.push.apply(previous, _.pluck(current.parts, 'count');
      return previous;
    }, []);
    var sortedCollections = [];
    sortedCollections.push(selectorsInRuleCount.sort(function(a,b) { return a - b; }));
    sortedCollections.push(partsInSelectorCount.sort(function(a,b) { return a - b; }));
    for (var i = 0; i < sortedCollections.length; ++i) {
      var currentCollection = sortedCollections[i];
      var point = currentCollection.length * percent;
      var currentResult;
      if ((point % 1) === 0) {
        currentResult = (currentCollection[point - 1] + currentCollection[point]) / 2;
      } else {
        // Exact match, so just return this value
        point = Math.floor(point);
        currentResult = currentCollection[point];
      }
      result.push(currentResult);
    }
    return result;
  };

  var percentil = CSSRuleChecker.percentil;

  CSSRuleChecker.checkRules = function(statistics) {

    if (!CSSRuleChecker.defaultStatistics) {
      CSSRuleChecker.defaultStatistics = [
      {name: 'median', func: _.partial(percentil, 0.5)},
      {name: '95th percentil', func: _.partial(percentil, 0.95)},
      {name: 'average', func: average},
      {name: 'max', func: max}
      ];
    };

    var finalStatistics = CSSRuleChecker.defaultStatistics;
    var customStatistics = CSSRuleChecker.customStatistics;
    if (customStatistics && typeof customStatistics === 'object') {
      finalStatistics = _.union(customStatistics, finalStatistics);
    }
    if (statistics && typeof statistics === 'object') {
      finalStatistics = _.union(statistics, finalStatistics);
    }

    CSSRuleChecker.statistics = _.uniq(finalStatistics, function(elem) { return elem.name });

    var stylesheets = document.styleSheets;
    var totalCount = 0;
    var totalAppliedCount = 0;
    var rules = [];

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
        rules.push.apply(rules, result.rules);
        console.log(result);
      }
    }

    console.info("There are " + totalCount + " rules");
    var notAppliedCount = totalCount - totalAppliedCount;
    console.info("Applied: " + totalAppliedCount + ", Not applied: " + notAppliedCount);

    CSSRuleChecker.totalCount = totalCount;
    CSSRuleChecker.appliedCount = totalAppliedCount;
    CSSRuleChecker.rules = rules;

    for (var j = 0; j < CSSRuleChecker.statistics.length; ++j) {
      var statistic = CSSRuleChecker.statistics[j];
      CSSRuleChecker[statistic.name] = getStatistic(statistic.name, rules, statistic.func);
    }

  };

  // returns a tuple containing:
  // - appliedSelectorCount
  // - totalSelectorCount
  // - selectorsPerRule
  // - partsPerSelector
  function analyzeStylesheet(stylesheet) {
    var appliedCount = 0;
    var totalCount = 0;
    var resultRules = [];

    if (!stylesheet) {
      return false;
    }
    // Remove all pseudo classes, as some sizzle versions
    // break on them
    var pseudoRegex = /([^:])\:[\w\-]+(?:\(.*\))?([.\s>+\[#,]*?)/gi;
    var replacementFunction = function(match, g1, g2) {
      return g1 + g2;
    };

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
        resultRules.push.apply(resultRules, result.rules);

      } else {

        totalCount += 1;

        var rule = {}, selectorText;
        rule.selectorText = selectorText = currentRule.selectorText;

        var cleanSelectorText = selectorText.replace(pseudoRegex, replacementFunction);
        var matchedElements = jQuery(cleanSelectorText);

        if ( matchedElements.length > 0 ){
          appliedCount += 1;
          //console.info(selectorText + " applies to " + matchedElements.length + " elements");
        } else {
          //console.warn(selectorText + " doesn't apply");
        }

        rule.applied = matchedElements.length ? matchedElements.length : false;

        // Analyze rule composition
        if (selectorText !== void 0 && selectorText !== null) {
          var selectorsInRule = selectorText.split(',');
          rule.parts = [];
          // This takes into account all possible ways to create a relationship between 2
          // selectors:
          // - spaces e.g: "parent children"
          // - '>' or '+' within spaces. e.g: "parent > children" "sibling + sibling
          // - attribute selector. e.g: "selector[attr="modifier"]
          // - status selector. e.g: "selector:status"
          var cssRegex = /\s+|\s*?[>+]\s*|\[|\:?\:/;
          for (var i = 0; i < selectorsInRule.length; ++i) {
            var selector = selectorsInRule[i];
            // Remove first '.' cause it made difficult to parse rules right
            var selectorParts = selector.split('.').filter(notEmpty).join(' ').split(cssRegex);
            rule.parts.push({'selector': selector, count: selectorParts.length});
          }
        }

        resultRules.push(rule);

      }
    }

    return {
      appliedSelectorCount: appliedCount,
      totalSelectorCount: totalCount,
      rules: resultRules
    };
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
    // selectorInRules
    var totalParts = _.reduce(collection, function(previous, current) {
      return previous + current.parts.length;
    }, 0);

    var avgSelectorInRules = totalParts / collection.length;

    // partsInSelector
    var partsCount = function(rule) {
      return _.pluck(rule.parts, 'count');
    };

    var sum = _.reduce(collection, function(previousValue, currentValue) {
      var currentValueSum = _.reduce(partsCount(currentValue), function(previous, current) {
        return previous + current;
      });
      return previousValue + currentValueSum;
    }, 0);

    var avgPartsInSelector = sum / totalParts;

    return [avgSelectorInRules, avgPartsInSelector];
  }

  function max(collection) {
    var maxSelectorsInRule = null, maxPartsInSelector = null;

    var sortedCollection = collection.sort(function(a,b) { return b.parts.length - a.parts.length; });
    maxSelectorsInRule = sortedCollection[0];
    var partsCount = function(part) {
      return part.count;
    };
    sortedCollection = collection.sort(function(a, b) {
      var aPartsCount = _.pluck(a.parts, 'count');
      var bPartsCount = _.pluck(b.parts, 'count');
      return Math.max.apply(this, bPartsCount) - Math.max.apply(this, aPartsCount);
    });
    maxPartsInSelector = sortedCollection[0];

    return {
      selectorInRule: {
        rule: maxSelectorsInRule,
        count: maxSelectorsInRule.parts.length
      },
      partsInSelector: {
        rule: maxPartsInSelector,
        count: Math.max.apply(this, _.pluck(maxPartsInSelector.parts, 'count'))
      }
    };
  }

  var loadDependency = function(scriptSrc) {
    var deferred = $.Deferred();

    if (!window._) {
      var script = document.createElement('script');
      script.src = scriptSrc;
      script.onload = function() {
        deferred.resolve();
      };
      document.body.appendChild(script);
    } else {
      deferred.resolve();
    }

    return deferred.promise();
  };

  var loadDependenciesAndRun = function() {
    $.when(
      loadDependency('https://raw.github.com/documentcloud/underscore/master/underscore-min.js'),
      loadDependency('https://raw.github.com/josh/css-explain/master/css-explain.js')
    ).then(CSSRuleChecker.checkRules);
  };

  // Load jQuery if it hasn't be previously loaded
  if (!window.jQuery) {
    var script = document.createElement( 'script' );
    script.src = '//ajax.googleapis.com/ajax/libs/jquery/1/jquery.min.js';
    script.onload = loadDependenciesAndRun();
    document.body.appendChild(script);
  }
  else {
    loadDependenciesAndRun();
  }


})();
