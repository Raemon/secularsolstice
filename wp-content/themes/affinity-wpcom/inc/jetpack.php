<?php
/**
 * Jetpack Compatibility File.
 *
 * @link https://jetpack.me/
 *
 * @package Affinity
 */

/**
 * Jetpack setup function.
 *
 * See: https://jetpack.me/support/infinite-scroll/
 * See: https://jetpack.me/support/responsive-videos/
 */
function affinity_jetpack_setup() {
	// Add theme support for Infinite Scroll.
	add_theme_support( 'infinite-scroll', array(
		'container'      => 'main',
		'render'         => 'affinity_infinite_scroll_render',
		'footer_widgets' => affinity_has_footer_widgets(),
		'footer'         => 'page',
	) );

	// Add theme support for Responsive Videos.
	add_theme_support( 'jetpack-responsive-videos' );

	// Add theme support for Social Menus
	add_theme_support( 'jetpack-social-menu' );

	/*
	 * Fall back to Jetpack Site Logo if no core custom logo exists
	 *
     * @todo Remove after WP 4.7 release
	 */
	if ( ! current_theme_supports( 'custom-logo' ) ) {
		
		add_image_size( 'affinity-logo', 800, 250 );

		add_theme_support( 'site-logo', array( 'size' => 'affinity-logo' ) );
	}
}
add_action( 'after_setup_theme', 'affinity_jetpack_setup' );

/**
 * Custom render function for Infinite Scroll.
 */
function affinity_infinite_scroll_render() {
	while ( have_posts() ) {
		the_post();
		if ( is_search() ) :
			get_template_part( 'components/post/content', 'search' );
		else :
			get_template_part( 'components/post/content', get_post_format() );
		endif;
	}
}


/**
 * Custom function to check for the presence of footer widgets or the social links menu
 */
function affinity_has_footer_widgets() {
	if ( is_active_sidebar( 'footer-1' ) ||
		 is_active_sidebar( 'footer-2' ) ||
		 is_active_sidebar( 'footer-3' ) ||
		 has_nav_menu( 'jetpack-social-menu' ) ) {
		return true;
	} else {
		return false;
	}
}

/*
 * Return early if no social menus are available
 */
function affinity_social_menu() {
	if ( ! function_exists( 'jetpack_social_menu' ) ) {
		return;
	} else {
		jetpack_social_menu();
	}
}
