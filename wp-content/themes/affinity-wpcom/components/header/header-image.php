
<div class="custom-header">
	<?php
		// You can upload a custom header and it'll output in a smaller logo size.
		$header_image = get_header_image();

		if ( has_post_thumbnail() && is_singular() ) {

			$post_thumbnail_id = get_post_thumbnail_id( $post->ID );

			$thumbnail_attributes = wp_get_attachment_image_src( $post_thumbnail_id, 'affinity-featured' );

			//Calculate aspect ratio: h / w * 100%
			$ratio = $thumbnail_attributes[2] / $thumbnail_attributes[1] * 100; ?>

			<div class="custom-header-image" style="padding-top: <?php echo esc_attr( $ratio ); ?>%; background-image: url(<?php echo esc_url( $thumbnail_attributes[0] ); ?>);">
			</div>

		<?php }

		else if ( ! empty( $header_image ) ) {

			$height = get_custom_header()->height;
			$width = get_custom_header()->width;

			$ratio = $height / $width * 100;
		?>

			<div class="custom-header-image" style="padding-top: <?php echo esc_attr( $ratio ); ?>%; background-image: url(<?php echo esc_url( $header_image ); ?>);">
			</div>

	<?php } // end if ?>

</div><!-- .custom-header -->
