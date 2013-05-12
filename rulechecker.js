(function(){

  // Global var to allow customization and multiple runs
  CSSRuleChecker = window.CSSRuleChecker || {};

  // percent is a number between 0 and 1
  CSSRuleChecker.percentil = function(percent, collection) {
    var result = [];
    // First for selectorsInRule
    // Sort first to calculate median
    var selectorsInRuleCount = _.map(collection.rules, function(rule) {
      return rule.partIndices.length;
    });
    var partsInSelectorCount = _.map(collection.parts, function(part) {
      return part.count;
    });
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

  function frequencies(collection) {
    var selectorsInRule = [];
    var partsInSelector = [];
    var i;

    for (i = 0; i < collection.rules.length; ++i) {
      var index = collection.rules[i].partIndices.length;
      if (selectorsInRule[index]) {
        selectorsInRule[index] += 1;
      } else {
        selectorsInRule[index] = 1;
      }
    }

    for (i = 0; i < collection.parts.length; ++i) {
      var index = collection.parts[i].count;
      if (partsInSelector[index]) {
        partsInSelector[index] += 1;
      } else {
        partsInSelector[index] = 1;
      }
    }

    return {
      selectorsInRule: selectorsInRule,
      partsInSelector: partsInSelector
    };

  }

  var percentil = CSSRuleChecker.percentil;

  CSSRuleChecker.checkRules = function(statistics) {

    if (!CSSRuleChecker.defaultStatistics) {
      CSSRuleChecker.defaultStatistics = [
      {name: 'median', func: _.partial(percentil, 0.5)},
      {name: '95th percentil', func: _.partial(percentil, 0.95)},
      {name: 'average', func: average},
      {name: 'max', func: max},
      {name: 'frequencies', func: frequencies}
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
    var cssResults = {
      rules: [],
      parts: []
    };

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

        updateIndices(result.rules, cssResults.rules.length, cssResults.parts.length);
        cssResults.rules.push.apply(cssResults.rules, result.rules.rules);
        cssResults.parts.push.apply(cssResults.parts, result.rules.parts);

        console.log(result);
      }
    }

    console.info("There are " + totalCount + " rules");
    var notAppliedCount = totalCount - totalAppliedCount;
    console.info("Applied: " + totalAppliedCount + ", Not applied: " + notAppliedCount);

    CSSRuleChecker.totalCount = totalCount;
    CSSRuleChecker.appliedCount = totalAppliedCount;
    CSSRuleChecker.rules = cssResults;

    for (var j = 0; j < CSSRuleChecker.statistics.length; ++j) {
      var statistic = CSSRuleChecker.statistics[j];
      CSSRuleChecker[statistic.name] = getStatistic(statistic.name, cssResults, statistic.func);
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
    var result = {
      rules: [],
      parts: []
    };

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
        var importResult = checkImportRule(currentRule);
        appliedCount += importResult.appliedSelectorCount;
        totalCount += importResult.totalSelectorCount;

        updateIndices(importResult.rules, result.rules.length, result.parts.length);
        result.rules.push.apply(result.rules, importResult.rules.rules);
        result.parts.push.apply(result.parts, importResult.rules.parts);
      } else {

        totalCount += 1;

        var rule = {
          selector: currentRule.selectorText,
          partIndices: [],
          applied: false,
        };

        var selectorAppliedCount = selectorAppliedTimes(rule.selector);

        if (selectorAppliedCount){
          appliedCount += 1;
          rule.applied = selectorAppliedCount;
        }

        // Analyze rule composition
        if (rule.selector !== void 0 && rule.selector !== null) {
          var selectorsInRule = rule.selector.split(',');

          // This takes into account all possible ways to create a relationship between 2
          // selectors:
          // - spaces e.g: "parent children"
          // - '>' or '+' within spaces. e.g: "parent > children" "sibling + sibling
          // - attribute selector. e.g: "selector[attr="modifier"]
          // - status selector. e.g: "selector:status"
          var cssRegex = /\s+|\s*?[>+]\s*|\[|\:?\:/;
          for (var i = 0; i < selectorsInRule.length; ++i) {
            // Remove first '.' cause it made difficult to parse rules right
            var selectorParts = selectorsInRule[i].split('.').filter(notEmpty).join(' ').split(cssRegex);
            var part = {
              selector: selectorsInRule[i],
              count: selectorParts.length,
              ruleIndex: result.rules.length,
            };

            rule.partIndices.push(result.parts.length);
            result.parts.push(part);
          }

          result.rules.push(rule);
        }

      }
    }

    return {
      appliedSelectorCount: appliedCount,
      totalSelectorCount: totalCount,
      rules: result
    };
  }

  function updateIndices(results, ruleCount, partCount) {
    var currentRule,
        currentPart,
        i;

    for (i = 0; i < results.rules.length; ++i) {
      currentRule = results.rules[i];
      currentRule.partIndices = currentRule.partIndices.map(function(index) {
        return index + partCount;
      });
    }

    for (i = 0; i < results.parts.length; ++i) {
      currentPart = results.parts[i];
      currentRule.ruleIndex += ruleCount;
    }

  }

  function selectorAppliedTimes(selector) {
    // Remove all pseudo classes, as some sizzle versions
    // break on them
    var pseudoRegex = /([^:\s])\:[\w\-]+(?:\(.*\))?([.\s>+\[#,]*?)/gi;
    var replacementFunction = function(match, g1, g2) {
      return g1 + g2;
    };
    var cleanSelectorText = selector.replace(pseudoRegex, replacementFunction);
    var matchedElements = jQuery(cleanSelectorText);
    return matchedElements.length;
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
    var totalSelectorsInRules, totalPartsInSelector;


    totalSelectorsInRules = _.reduce(collection.rules, function(previous, current) {
      return previous + current.partIndices.length;
    }, 0);

    totalPartsInSelector = _.reduce(collection.parts, function(previous, current) {
      return previous + current.count;
    }, 0);

    return {
      selectorInRules: totalSelectorsInRules / collection.rules.length,
        partsInSelector: totalPartsInSelector / collection.parts.length
    };
  }

  function max(collection) {
    var maxSelectorsInRule = null, maxPartsInSelector = null;

    maxSelectorsInRule = _.max(collection.rules, function(rule) {
      return rule.partIndices.length;
    });

    maxPartsInSelector = _.max(collection.parts, function(part) {
      return part.count;
    });

    return {
      selectorInRule: {
                        rule: maxSelectorsInRule.selector,
                          count: maxSelectorsInRule.partIndices.length
                      },
        partsInSelector: {
                           rule: maxPartsInSelector.selector,
                           count: maxPartsInSelector.count
                         }
    };
  }

  var loadDependency = function(existenceCheck, scriptSrc) {
    var deferred = $.Deferred();

    if (!existenceCheck) {
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

    var dependenciesPromise = [
      loadDependency(window._ && window._.VERSION > "1.4.4", 'https://raw.github.com/documentcloud/underscore/master/underscore-min.js'),
      loadDependency(window.cssExplain, 'https://raw.github.com/josh/css-explain/master/css-explain.js')
        ];

    if (CSSRuleChecker.dependencies) {
      for (var i = 0; i < CSSRuleChecker.dependencies.length; ++i) {
        dependenciesPromise.push(loadDependency(null, CSSRuleChecker.dependencies[i]));
      }
    }

    $.when.apply($, dependenciesPromise).then(CSSRuleChecker.checkRules);
  };

  // Load jQuery if it hasn't be previously loaded
  if (!window.jQuery) {
    var script = document.createElement( 'script' );
    script.src = '//ajax.googleapis.com/ajax/libs/jquery/1/jquery.min.js';
    script.onload = loadDependenciesAndRun;
    document.body.appendChild(script);
  }
  else {
    loadDependenciesAndRun();
  }


})();
