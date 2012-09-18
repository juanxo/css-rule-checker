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
    for ( var index = 0; index < stylesheets.length; ++index ){
      var currentStylesheet = stylesheets[index];
      if ( currentStylesheet != null){
        var stylesheetName = "Inline Style";
        if (currentStylesheet.ownerNode.tagName.toLowerCase() === "link") {
          stylesheetName = currentStylesheet.href;
        }
        console.info("Stylesheet " + index + ": " + stylesheetName);
        var rules = currentStylesheet.rules;
        for ( var j = 0; j < rules.length; ++j ){
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
          }
        } 
      }
      
      
    }
    console.info("There are " + totalRuleCount + " rules");
    var notAppliedRuleCount = totalRuleCount - totalAppliedRuleCount;
    console.info("Applied: " + totalAppliedRuleCount + ", Not applied: " + notAppliedRuleCount);
  }
  
  // Iterates over import rule, returning [appliedRuleCount, totalRuleCount] for that import.
  function checkImportRule( importRule ) {
    var stylesheet = importRule.styleSheet;
    var appliedRulesCount = 0;
    var totalRulesCount = 0;
    for ( var i = 0; i < stylesheet.rules.length; ++i ) {
      var currentRule = sytlesheet.rules[i];
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
      }
    }
    
    return [appliedRulesCount, totalRulesCount];
  }
})();