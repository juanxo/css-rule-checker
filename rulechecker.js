(function(){
  for ( index in document.styleSheets){
    console.info("Stylesheet " + index + ": " + document.ststyleSheets[index].href);
  }
})();