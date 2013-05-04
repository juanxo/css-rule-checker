(function(){
  // Load jQuery if it hasn't be previously loaded
  if (!window.jQuery) { 
    script = document.createElement( 'script' );  
    script.src = 'http://ajax.googleapis.com/ajax/libs/jquery/1/jquery.min.js';   
    script.onload=checkRules;  
    document.body.appendChild(script); 
    jQuery.noConflict();
  }   
  else {  
      checkRules();  
  }
  
  function checkRules() {
    var stylesheets = document.styleSheets;  
    var totalRuleCount = 0;
    var totalAppliedRuleCount = 0;
    var partsPerSelector = [];
    var selectorsPerRule = [];
    
    for ( var index = 0; stylesheets && index < stylesheets.length; ++index ){
      var currentStylesheet = stylesheets[index];
      if ( currentStylesheet != null){
        var stylesheetName = "Inline Style";
        if (currentStylesheet.ownerNode.tagName.toLowerCase() === "link") {
          stylesheetName = currentStylesheet.href;
        }
        console.info("Stylesheet " + index + ": " + stylesheetName);
        var rules = currentStylesheet.rules;
        for ( var j = 0; rules && j < rules.length; ++j ){
          var currentRule = rules[j];
          if ( currentRule instanceof CSSImportRule ) {
            var result = checkImportRule(currentRule);
            totalAppliedRuleCount += result[0]; 
            totalRuleCount += result[1];
            
          } else {
            totalRuleCount += 1;
            
            var selectorText = currentRule.selectorText;
            var matchedElements = jQuery(selectorText);
            
            if ( matchedElements.length > 0 ){
              totalAppliedRuleCount += 1;
              console.info(selectorText + " applies to " + matchedElements.length + " elements");
            } else {
              console.warn(selectorText + " doesn't apply");
            }
            
            // Analyze rule composition
            if (selectorText != void 0 && selectorText != null) {
              var selectorsInRule = selectorText.split(',');
              selectorsPerRule.push(selectorsInRule.length);
              var cssRegex = /\s+|\s*?[>+]\s*?|\[\:/;
              for (var i in selectorsInRule) {
                // Remove first '.' cause it made difficult to parse rules right
                var selectorParts = selectorsInRule[i].split('.').filter(notEmpty).join(' ').split(cssRegex);
                partsPerSelector.push(selectorParts.length);
              }
            }
            
          }
        } 
      }
      
      
    }
    console.info("There are " + totalRuleCount + " rules");
    var notAppliedRuleCount = totalRuleCount - totalAppliedRuleCount;
    console.info("Applied: " + totalAppliedRuleCount + ", Not applied: " + notAppliedRuleCount);
    
    getStatistics(selectorsPerRule);
    getStatistics(partsPerSelector);
    
  }
  
  // Iterates over import rule, returning [appliedRuleCount, totalRuleCount] for that import.
  function checkImportRule( importRule ) {
    var stylesheet = importRule.styleSheet;
    var appliedRulesCount = 0;
    var totalRulesCount = 0;
    for ( var i = 0; stylesheet.rules && i < stylesheet.rules.length; ++i ) {
      var currentRule = stylesheet.rules[i];
      if ( currentRule instanceof CSSImportRule ) {
        var results = checkImportRule(currentRule);
        appliedRulesCount += results[0];
        totalRulesCount += results[1];
      } else {
        totalRulesCount += 1;
        var selectorText = currentRule.selectorText;
        var matchedElements = jQuery(selectorText);
        
        if ( matchedElements.length > 0 ){
          appliedRulesCount += 1;
          console.info(selectorText + " applies to " + matchedElements.length + " elements");
        } else {
          console.warn(selectorText + " doesn't apply");
        }
        
        // Analyze rule composition
        if (selectorText != void 0 && selectorText != null) {
          var selectorsInRule = selectorText.split(',');
          selectorsPerRule.push(selectorsInRule.length);
          var cssRegex = /\s+|\s*?[>+]\s*?|\[\:/;
          for (var index in selectorsInRule) {
            // Remove first '.' cause it made difficult to parse rules right
            var selectorParts = selectorsInRule[index].split('.').filter(notEmpty).join(' ').split(cssRegex);
            partsPerRule.push(selectorParts.length);
          }
        }
      }
    }
    
    return [appliedRulesCount, totalRulesCount];
  }
  
  function notEmpty(element) {
    return element !== '';
  }
  
  function getStatistics(collection) {
    var median, mid, average;
    
    if (collection.length > 0) {
      // Sort first to calculate median
      collection = collection.sort(function(a,b) { return a <= b; });
      mid = collection.length / 2;
      if ((collection.length % 2) === 0) {
        median = (collection[mid] + collection[mid + 1]) / 2;
      } else {
        median = collection[mid + 1];
      }
      
      average = 0;
      for (index in collection) {
        average += collection[index];
      }
      
      average /= collection.length;
      
      console.log("SelectorsPerRule: Median", median, "Average", average);
    }
  }
})();
