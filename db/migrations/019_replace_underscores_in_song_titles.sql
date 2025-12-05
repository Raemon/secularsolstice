update songs
set title = replace(title, '_', ' ')
where title like '%_%';
