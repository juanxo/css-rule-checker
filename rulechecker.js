(function(){
  
  var stylesheets = document.styleSheets;  
  for ( index in stylesheets){
    var currentStylesheet = stylesheets[index];
    if ( currentStylesheet != null){
      console.info("Stylesheet " + index + ": " + currentStylesheet.href);
      var rules = currentStylesheet.rules;
      for ( j in rules){
        var currentRule = rules[j];
        var selectorText = currentRule.selectorText;
        console.info(selectorText);
        var matchedElements = $(selectorText);
        
        if ( matchedElements.length > 0 ){
          console.info(selectorText + " applies to " + matchedElements.length + "elements");
        } else {
          console.warn(selectorText + " doesn't apply");
        }
      } 
    }
    
  }
})();