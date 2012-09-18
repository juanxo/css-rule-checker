CSS RULE CHECKER
================

Javascript function to test how many loaded CSS rules apply to the current page.
It prints the results in the console:

1. Each rule selector with the times that rule applies
1. Summary of total rules applied / total rules declared

To use it, create a new bookmark in your browser and use the following as link:
```javascript
javascript:(function(){var%20script=document.createElement('script');script.src='https://raw.github.com/Juanxo/css-rule-checker/master/rulechecker.js';document.body.appendChild(script);})()
```

![refactor all the css](http://cdn.memegenerator.net/instances/400x/26947966.jpg)