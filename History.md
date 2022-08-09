## 1.2.1 // 2022-08-09
* (fix) Removed a bad `$match` aggregation operator that was accidentally left over from previous fix.

## 1.2.0 // 2022-08-04
* (feat) Added destination tracking with 'VENDOR' & 'CUSTOMER'
* (fix) Added conditional logic to ignore invalid legacy packing slips where items was non-empty array of empty objects.

## 1.1.4 // 2022-07-22
* (fix) Make shipment search case insensitive

## 1.1.3 // 2022-07-08
* (feat) Add edit/deletion tracking. This is still a background feature and is not visible through any endpoints

## 1.1.2 // 2022-06-27
* (fix) Fix a bug where shipped quantities were being summed incorrectly.

## 1.1.1 // 2022-06-21
* (fix) Match Part in packing slip search works as expected
* (fix) Sorting in all tabs works as expected
* (fix) totalCount of matching documents is sent to front end for pagination

## 1.1.0 // 2022-06-13
* (feat) Add search functionality to packing slip history page. Same as Shipment history page.

## 1.0.1 // 2022-06-07
* (fix) some `async` functions not returning results according to `[err, data]` convention.

## 1.0.0 // 2022-04-20
* First commit. Ported over code from `pack-ship-demo`. Client and server code have been split into separate repos. See [pack-ship-client](https://github.com/conturo-prototyping/pack-ship-client)