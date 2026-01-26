=== Add Background-Size to Customizer ===
Contributors: cmborchert
Tags: background, image, customizer, appearance, css
Requires at least: 3.4.0
Tested up to: 4.2.3
Stable tag: trunk
License: GPLv2 or later
License URI: http://www.gnu.org/licenses/gpl-2.0.html

Allows you to control the background-size of your main background image from the comfort of the customizer, using predetermined values or custom CSS.

== Description ==
This plugin for Wordpress adds a background-size controller to the Background Image section in the Wordpress Customizer. 

You can access the new controller by going to **Appearance > Customize** from the Dashboard, and clicking on the **Background Image** section.

Once you've added your custom background image, you can set your background-image size to: 
 - "Cover": As large as possible; fills entire view, with cropping.
 - "Contain": As large as possible, without cropping; fits inside of view.
 - "100% width": Width fits view perfectly, height may be smaller or larger than view (equivalent to css '100% auto').
 - "100% height": Height fits view perfectly, width may be smaller or larger than view (equivalent to css 'auto 100%').
 - "Inherit": Sets background size to whatever parent element is set to (html, in this case).
 - "Custom": Allows you to put in your own css to be applied in the section called "CSS for background-size (if 'custom' selected)." 

To learn more about the CSS background-size property, go to: 

https://developer.mozilla.org/en-US/docs/Web/CSS/background-size
or
http://www.w3schools.com/cssref/css3_pr_background-size.asp 
 
== Installation ==

1. Upload `add-bg-size-to-customizer.php` to the `/wp-content/plugins/` directory
2. Activate the plugin through the 'Plugins' menu in WordPress

That's it!

== Screenshots ==

1. Demonstrating custom CSS to create a tiled 100px by 100px background.
2. Demonstrating "Cover" option.

== Changelog ==

= 0.0.1 =
* Initial release

== Notes ==

**Notes:**
*The plugin works by adding styles to the body.custom-background class. If the default custom-background support has been disrupted, then this plugin will not work.