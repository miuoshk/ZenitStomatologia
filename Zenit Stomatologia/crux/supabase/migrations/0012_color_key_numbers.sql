-- K12 · color_key gabinetów: dodaj '01'–'04' (docs/14: 01 Nowodworska, 02 Białowieska).
-- loc1–loc4 zostają dla wstecznej zgodności testów i istniejących danych.
alter table org.locations drop constraint if exists locations_color_key_check;
alter table org.locations
  add constraint locations_color_key_check
  check (color_key in ('loc1', 'loc2', 'loc3', 'loc4', '01', '02', '03', '04'));
