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
    for ( index in stylesheets){
      var currentStylesheet = stylesheets[index];
      if ( currentStylesheet != null){
        console.info("Stylesheet " + index + ": " + currentStylesheet.href);
        var rules = currentStylesheet.rules;
        for ( j in rules){
          totalRuleCount += 1;
          var currentRule = rules[j];
          var selectorText = currentRule.selectorText;
          var matchedElements = jQuery(selectorText);
          
          if ( matchedElements.length > 0 ){
            totalAppliedRuleCount += 1;
            console.info(selectorText + " applies to " + matchedElements.length + "elements");
          } else {
            console.warn(selectorText + " doesn't apply");
          }
        } 
      }
      
      
    }
    console.info("There are " + totalRuleCount + " rules");
    var notAppliedRuleCount = totalRuleCount - totalAppliedRuleCount;
    console.info("Applied: " + totalAppliedRuleCount + ", Not applied: " + notAppliedRuleCount);
  }    
})();