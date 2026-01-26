=== Plugin Name ===
Contributors: olliejones
Tags: jetpack, shortcodes, media, player, audio, video, images, slideshow, polldaddy, ted, bandcamp, presentations, twitter-timeline, vine, HTML5
Requires at least: 3.0.1
Tested up to: 4.1
Stable tag: 2.5
License: GPLv2 or later
License URI: http://www.gnu.org/licenses/gpl-2.0.html

This plugin provides the same shortcodes that are found in Jetpack, but without Jetpack's activation overhead.

== Description ==

The same media shortcodes as in Jetpack are provided here.

Jetpack's legacy (pre 3.6) Flash audio player (with HTML5 support for non-Flash-capable browsers)
supporting the [audio] shortcode is bundled into this plugin. If you're running a pre 3.6 version of WordPress
you can use this plugin's audio player.  If you're running WordPress 3.6 or later and you
also run this plugin, you have a choice (on the Media Settings panel) of using the new core audio player or the legacy player.

This plugin offers compatibility between the old-style (Jetpack) and new style (3.6 core) [audio] shortcode parameters, so
you can migrate to the new player without altering your content.

The Jetpack legacy audio player's assets (swf, css, js) will be served from your server rather than Wordpress.com's if you use
this plugin.

== Installation ==

Follow the usual Wordpress plugin installation procedures.

Please avoid activatating both this plugin and Jetpack.

== Frequently Asked Questions ==

= Why this plugin? =

Your hosting provider may have trouble supporting Jetpack. 
For example the notorious SSL timeout when trying to connect to wordpress.com/jetpack may be getting in your way. Use this plugin to get your shortcodes back.

= Hey? What happened to my post that has more than one [audio] shortcode in it? =

You may have mixed closed and unclosed [audio] shortcodes in one post. This can make WordPress
skip a lot of your content and not display it.

A closed shortcode looks like this:
      [audio mp3="url"][/audio]

A unclosed shortcode looks like this:
      [audio mp3="url"]

It's relatively easy to mix closed and unclosed shortcodes when you have old pre-3.6 content you're updating.
The WordPress core media manager for version 2.6 and beyond
has a way to insert an embedded audio player, and it always inserts a closed shortcode.
It's likely that your old content has unclosed shortcodes.

For more information [see this explanation in the WordPress Codex](http://codex.wordpress.org/Shortcode_API#Unclosed_Shortcodes).

== Changelog ==

= 2.5 =

Synchronized with Jetpack 2.5 : Small changes to twitter-timeline and presentations implementations.

= 2.4.2 =

Synchronized with Jetpack 2.4.2 : Add presentations, twitter-timeline, and vine shortcodes

Integrated with WordPress 3.6: When both WP3.6+ and Shortpack are installed,
                               there's an item on the Media Settings panel
                               offering a choice of legacy or core-embedded
                               audio player.
                               Shortcode parameters are adapted appropriately.

Tested with WP 3.9.

= 2.3.3 =

Synchronized with Jetpack 2.3.3 : Small changes to implementation of slideshow and bandcamp shortcodes

= 2.3 =

Synchronized with Jetpack 2.3 : Small changes to implementation of audio and bandcamp shortcodes

= 2.2.5 =

Synchronized with Jetpack 2.2.5 : fix a problem with [bandcamp] shortcode

= 2.2.4 =

Synchronized with Jetpack 2.2.4 :  Bring in [audio] vulnerability fix, add [bandcamp] shortcode.

= 2.2.1 =

Synchronized with Jetpack 2.2.1 :  [audio] shortcode has new stylesheets.

= 2.2 =

Synchronized with Jetpack 2.2 : Infinite-scroll change to [audio] shortcode, and new
version of [soundcloud] shortcode support.


== Upgrade Notice ==

= 2.5 =

Synchronized with Jetpack 2.5 : add vines, twitter-timeline and presentations implementations; choice of
legacy or 3.6+ core plugin on Media Settings page.

Tested with WP 3.9

== Credits ==

This plugin incorporates shortcode implementations from Jetpack. Thanks to the team at wordpress.com.

