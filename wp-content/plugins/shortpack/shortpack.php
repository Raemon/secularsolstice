<?php
/*
Plugin Name: Shortpack
Plugin URI: http://www.plumislandmedia.net/wordpress-plugins/shortpack/
Description: Jetpack 2's shortcodes for media, without Jetpack's overhead or activation glitches. Thanks to the Jetpack team for good code.
Author: olliejones, automattic
Version: 2.5
Author URI: http://www.plumislandmedia.net/about/
*/
/** current version number  */
if ( !defined( 'SHORTPACK_VERSION_NUM' ) ) {
    define('SHORTPACK_VERSION_NUM', '2.5');
}
/* set up some handy globals */
if ( !defined( 'SHORTPACK_THEME_DIR' ) ) {
    define('SHORTPACK_THEME_DIR', ABSPATH . DIRECTORY_SEPARATOR . 'themes' . DIRECTORY_SEPARATOR . get_template());
}
if ( !defined( 'SHORTPACK_PLUGIN_NAME' ) ) {
    define('SHORTPACK_PLUGIN_NAME', trim( dirname( plugin_basename( __FILE__ ) ), '/' ));
}
if ( !defined( 'SHORTPACK_PLUGIN_DIR' ) ) {
    define('SHORTPACK_PLUGIN_DIR', WP_PLUGIN_DIR . DIRECTORY_SEPARATOR . SHORTPACK_PLUGIN_NAME);
}
if ( !defined( 'SHORTPACK_PLUGIN_URL' ) ) {
    define('SHORTPACK_PLUGIN_URL', WP_PLUGIN_URL . '/' . SHORTPACK_PLUGIN_NAME);
}
if ( !defined( 'SHORTPACK_POSTMETA_KEY' ) ) {
    define('SHORTPACK_POSTMETA_KEY', '_' . SHORTPACK_PLUGIN_NAME . '_metadata');
}

/**
 * Transforms the $atts array into a string that the old functions expected
 *
 * The old way was:
 * [shortcode a=1&b=2&c=3] or [shortcode=1]
 * This is parsed as array( a => '1&b=2&c=3' ) and array( 0 => '=1' ), which is useless
 *
 * @param Array $params
 * @param Bool $old_format_support true if [shortcode=foo] format is possible.
 * @return String $params
 */
function shortcode_new_to_old_params( $params, $old_format_support = false )
{
    $str = '';

    if ( $old_format_support && isset($params[0]) ) {
        $str = ltrim( $params[0], '=' );
    } elseif ( is_array( $params ) ) {
        foreach ( array_keys( $params ) as $key ) {
            if ( !is_numeric( $key ) )
                $str = $key . '=' . $params[$key];
        }
    }

    return str_replace( array('&amp;', '&#038;'), '&', $str );
}

function shortpack_load_everything()
{
    global $wp_version;

    /* figure out core or jetpack audio player in 3.6+ */
    $audio_player_choice = 'shortpack';
    if ( version_compare( $wp_version, '3.6-z', '>=' ) ) {
        $options = get_option( 'shortpack_options' );
        $audio_player_choice = (empty($options['which_audio_player'])) ? 'core' : $options['which_audio_player'];
    }

    /* we need an admin option in 3.6+, because there's an HTML audio player
     * in core that potentially conflicts with this one.
     */
    if ( version_compare( $wp_version, '3.6-z', '>=' ) && is_admin() && current_user_can( 'manage_options' ) ) {
        load_plugin_textdomain( 'shortpack', SHORTPACK_PLUGIN_DIR, 'languages' );
        require_once('code/shortpack_admin.php');
    }

    if ( $audio_player_choice == 'shortpack' ) {
        /* substitute local swf audio player path for legacy jetpack audio player */
        add_filter( 'jetpack_static_url_hack', 'shortpack_jetpack_static_url', 10, 1 );

        /**
         * change the static url for the old jetpack audio player asset to this plugin.
         * @param string $u
         * @return string pointing to player asset in the shortcode plugin.
         */
        function shortpack_jetpack_static_url_hack( $u )
        {
            $playername = '/plugins/audio-player/player.swf';
            /* does the swf playername appear at the end of the input URL string? */
            if ( strpos( $u, $playername ) == strlen( $u ) - strlen( $playername ) ) {
                $u = SHORTPACK_PLUGIN_URL . '/code/shortcodes/swf/player.swf';
            }
            return $u;
        }
    }

    /* go get the shortcode modules */
    $path = untrailingslashit( SHORTPACK_PLUGIN_DIR . DIRECTORY_SEPARATOR . "code" . DIRECTORY_SEPARATOR . "shortcodes" );
    $shortcode_includes = array();

    if ( $dir = @opendir( $path ) ) {
        while ( false !== $file = readdir( $dir ) ) {
            /* skip over . .. and non .php files */
            $file = $path . DIRECTORY_SEPARATOR . $file;
            if ( !is_dir( $file ) && is_readable( $file ) && '.php' == substr( $file, -4 ) ) {
                $shortcode_includes[] = $file;
            }
        }
    }
    @closedir( $dir );

    /* implement jetpack's filter to reject certain shortcodes */
    $shortcode_includes = apply_filters( 'jetpack_shortcodes_to_include', $shortcode_includes );

    foreach ( $shortcode_includes as $include ) {
        if ( $audio_player_choice != 'shortpack' && stristr( $include, 'audio.php' ) )
            continue;

        include $include;
    }

    if ( $audio_player_choice == 'core' ) {

        /* this shortcode_atts_audio filter hook is in the core audio player in 3.6+ */
        add_filter( 'shortcode_atts_audio', 'shortpack_audio_atts_handler', 10, 3 );

        /**
         * Filter handler for {mediatype}-atts-handler to translate old-style
         * pre-3.6 Jetpack audio player parameters (which include caption data to
         * embed in the scrolling Flash player window) to the new-style
         * attributes for the html5 audio player in core.
         *
         * Notice that the 3.6+ core media manager inserts
         *      [audio src="url"][/audio]
         * style shortcodes with contained content.
         * If these are mixed in a single post with shortcodes that don't have
         * the [/audio] close tag, lots of content in the post may get consumed.
         * (this is a WP day-1 design defect in the shortcode system.)
         *
         * @param $out  parameters, including ['src'] ['loop'] ['autoplay'] ['preload']
         * @param $pairs
         * @param $atts raw attributes list from shortcode
         * @return mixed returned value of $out parameter, updated appropriately
         */
        function shortpack_audio_atts_handler( $out, $pairs, $atts )
        {
            $good_url = false;
            foreach ( array('mp3', 'src') as $key ) {
                if ( array_key_exists( $key, $out ) && strlen( $out[$key] ) > 0 ) {
                    $good_url = true;
                    break;
                }
            }
            if ( !$good_url ) {
                $parms = array();
                /* recrack the legacy parameter string at the pipe marks */
                $parms = explode( '|', implode( ' ', $atts ) );

                if ( isset($parms[0]) ) {
                    $out['src'] = $parms[0];
                }
            }
            return $out;
        }
    } else {

        /* this shortpack_atts_audio filter hook is in shortpack's version of the legacy jetpack audio.php  */
        add_filter( 'shortpack_atts_audio', 'shortpack_core_atts_handler' );

        /**
         * Filter handler for translating new-style
         * 3.6 Jetpack audio player parameters to the old-style
         * attributes for the legacy Jetpack-based audio player in core.
         *
         * @param $atts  array of stuff
         * @return mixed returned value of $atts parameter, updated appropriately
         */
        function shortpack_core_atts_handler( $atts )
        {
            $result = $atts;
            if ( array_key_exists( 'src', $atts ) ) {
                unset($result);
                $result[0] = $atts['src'];
            }
            if ( array_key_exists( 'mp3', $atts ) ) {
                unset($result);
                $result[0] = $atts['mp3'];
            }
            return $result;
        }

    }
}

add_action( 'init', 'shortpack_load_everything' );
