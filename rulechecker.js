(function(){
  
  if (!($ = window.jQuery)) { // typeof jQuery=='undefined' works too  
    console.info("Jquery is not defined");
  }   
  else {  
      console.info("Jquery is defined");
  }  
  
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
        var length = $(selectorText).length;
        console.info(matchedElements.toString());
        
        if ( matchedElements.length > 0 ){
          console.info(selectorText + " applies to " + matchedElements.length() + "elements");
        } else {
          console.warn(selectorText + " doesn't apply");
        }
      } 
    }
    
  }
})();