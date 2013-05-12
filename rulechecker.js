(function(){

  // Global var to allow customization and multiple runs
  CSSRuleChecker = window.CSSRuleChecker || {};


  var percentil = CSSRuleChecker.percentil;

  CSSRuleChecker.checkRules = function(statistics) {

    var finalStatistics = CSSRuleChecker.defaultStatistics;
    var customStatistics = CSSRuleChecker.customStatistics;
    if (_.isArray(customStatistics)) {
      finalStatistics = _.union(customStatistics, finalStatistics);
    }
    if (_.isArray(statistics)) {
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

    CSSRuleChecker.results = {};
    for (var j = 0; j < CSSRuleChecker.statistics.length; ++j) {
      var statistic = CSSRuleChecker.statistics[j];
      CSSRuleChecker.results[statistic.name] = statistic.func(cssResults);
      console.log(statistic.name, CSSRuleChecker.results[statistic.name]);
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
        var importResult = analyzeStylesheet(currentRule.styleSheet);
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

            // Trim leading and traling whitespaces
            var selector = selectorsInRule[i].replace(/^\s*([\S][\s\S]*[\S])\s*$/, '$1');

            // Remove first '.' cause it made difficult to parse rules right
            var selectorParts = selector.split('.').filter(notEmpty).join(' ').split(cssRegex);
            var part = {
              selector: selector,
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

    var cleanSelectorText = selector.replace(pseudoRegex, '$1$2');
    var matchedElements = jQuery(cleanSelectorText);
    return matchedElements.length;
  }

  function notEmpty(element) {
    return element !== '';
  }

  // algorithm must be a function that returns a number value
  function getStatistic(statName, collection, algorithm) {
    var result = algorithm(collection);
    console.log(statName, result);
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
      loadDependency(window.cssExplain, 'https://raw.github.com/josh/css-explain/master/css-explain.js'),
      loadDependency(null, 'https://raw.github.com/Juanxo/css-rule-checker/master/statistics.js')
    ];

    if (CSSRuleChecker.dependencies) {
      for (var i = 0; i < CSSRuleChecker.dependencies.length; ++i) {
        dependenciesPromise.push(loadDependency(null, CSSRuleChecker.dependencies[i]));
      }
    }

    $.when.apply($, dependenciesPromise).then(CSSRuleChecker.checkRules);
  };

  // Load jQuery if it hasn't be previously loaded
  if (!window.jQuery || window.jQuery().jquery < '1.9.0') {
    var script = document.createElement( 'script' );
    script.src = '//ajax.googleapis.com/ajax/libs/jquery/1/jquery.min.js';
    script.onload = loadDependenciesAndRun;
    document.body.appendChild(script);
  }
  else {
    loadDependenciesAndRun();
  }


})();
