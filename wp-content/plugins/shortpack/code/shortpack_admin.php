<?php

/** Class wrapper for shortpack plugin admin options
 *  This adds a section to the media settings page.
 */

class ShortpackAdmin
{

    /**
     * Initialize the administration page operations.
     */
    public function __construct()
    {
        add_action( 'admin_menu', array($this, 'admin_actions') );
        add_action( 'admin_init', array($this, 'register_setting') );
    }

    function admin_actions()
    {
        if ( !current_user_can( 'manage_options' ) )
            wp_die( __( 'You do not have sufficient permissions to manage options for this site.' ) );

        load_plugin_textdomain( 'shortcode', SHORTPACK_PLUGIN_DIR, 'languages' );
        $this->augment_media_admin_page();
    }

    function register_setting()
    {
        register_setting( 'media', 'shortpack_options', array($this, 'validate_options') );
    }

    /**
     * emit the heading
     */
    function general_text()
    {
        echo '<p>' . __( 'You are running <em>both</em> WordPress Version 3.6+ <em>and</em> the Shortpack plugin.', 'shortpack' );
        echo __( 'Therefore, you have a choice of audio player:', 'shortpack' ) . '</p>';
    }

    /**
     * emit the player choice question
     */
    function which_player_text()
    {
        // get option 'audio' value from the database
        $options = get_option( 'shortpack_options' );
        $choice = (empty($options['which_audio_player'])) ? 'core' : $options['which_audio_player'];

        $choices = array(
            'core' => __( 'WordPress 3.6 HTML5 audio player.', 'shortpack' ),
            'shortpack' => __( 'legacy Jetpack-derived (Flash, HTML5) audio player.', 'shortpack' ),
        );
        $pattern = '<input type="radio" id="shortcode_admin_which_audio_player" name="shortpack_options[which_audio_player]" value="%1$s" %2$s> %3$s';

        $f = array();
        foreach ( $choices as $i => $k ) {
            $checked = ($choice == $i) ? 'checked' : '';
            $f[] = sprintf( $pattern, $i, $checked, $k );
        }
        echo implode( '&nbsp;&nbsp;&nbsp;&nbsp', $f );
        unset ($f);
    }

    /**
     * validate the options settings
     * @param array $input
     * @return validated array
     */
    function validate_options( $input )
    {
        $codes = array(
            'which_audio_player');
        $valid = array();
        foreach ( $codes as $code ) {
            $valid[$code] = htmlspecialchars_decode( $input[$code] );
        }
        return $valid;
    }

    function augment_media_admin_page()
    {

        add_settings_section(
            'shortpack_admin',
            __( 'Audio Player Choice', 'shortpack' ),
            array($this, 'general_text'),
            'media' );

        add_settings_field(
            'shortpack_which_player',
            __( 'Choose the ...', 'shortpack' ),
            array($this, 'which_player_text'),
            'media',
            'shortpack_admin'
        );
    }
}

new ShortpackAdmin();
