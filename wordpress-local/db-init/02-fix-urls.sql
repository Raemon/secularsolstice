UPDATE e0c_options SET option_value='http://localhost:8090' WHERE option_name IN ('siteurl','home');
UPDATE e0c_options SET option_value='affinity-wpcom' WHERE option_name IN ('template', 'stylesheet');
UPDATE e0c_options SET option_value='a:1:{i:0;s:30:\"advanced-custom-fields/acf.php\";}' WHERE option_name='active_plugins';
