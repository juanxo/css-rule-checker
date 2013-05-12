/* global CSSRuleChecker:true, _:true */
(function() {

  CSSRuleChecker = window.CSSRuleChecker || {};

  CSSRuleChecker.statisticFunctions = {
    percentil: percentil,
    average: average,
    max: max,
    frequencies: frequencies
  };

  CSSRuleChecker.defaultStatistics = [
  {name: 'median', func: _.partial(percentil, 0.5)},
  {name: '95th percentil', func: _.partial(percentil, 0.95)},
  {name: 'average', func: average},
  {name: 'max', func: max},
  {name: 'frequencies', func: frequencies}
  ];

  CSSRuleChecker.comparators = {
    ascending: ascending
  };

  var comparators = CSSRuleChecker.comparators;

  // percent is a number between 0 and 1
  function percentil(percent, collection) {
    var result = [];
    // First for selectorsInRule
    // Sort first to calculate median
    var selectorsInRuleCount = _.map(collection.rules, function(rule) {
      return rule.partIndices.length;
    });
    var partsInSelectorCount = _.pluck(collection.parts, 'count');

    var sortedCollections = [];
    sortedCollections.push(selectorsInRuleCount.sort(comparators.ascending));
    sortedCollections.push(partsInSelectorCount.sort(comparators.ascending));

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

  function frequencies(collection) {
    var selectorsInRule = [];
    var partsInSelector = [];
    var i, index;

    for (i = 0; i < collection.rules.length; ++i) {
      index = collection.rules[i].partIndices.length;
      if (selectorsInRule[index]) {
        selectorsInRule[index] += 1;
      } else {
        selectorsInRule[index] = 1;
      }
    }

    for (i = 0; i < collection.parts.length; ++i) {
      index = collection.parts[i].count;
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

  function ascending(a, b) {
    return a - b;
  }

})();
