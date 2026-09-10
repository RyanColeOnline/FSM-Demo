echo "Backfilling customers into BigQuery..."
npx @firebaseextensions/fs-bq-import-collection --project=murphys-fsm-staging --source-collection-path=customers --dataset=fsm_analytics --table-name-prefix=customers --batch-size=300 --dataset-location=us --multi-threaded=true --non-interactive

echo "Backfilling jobs into BigQuery..."
npx @firebaseextensions/fs-bq-import-collection --project=murphys-fsm-staging --source-collection-path=jobs --dataset=fsm_analytics --table-name-prefix=jobs --batch-size=300 --dataset-location=us --multi-threaded=true --non-interactive

echo "Backfilling appointments into BigQuery..."
npx @firebaseextensions/fs-bq-import-collection --project=murphys-fsm-staging --source-collection-path=appointments --dataset=fsm_analytics --table-name-prefix=appointments --batch-size=300 --dataset-location=us --multi-threaded=true --non-interactive

echo "Backfilling invoices into BigQuery..."
npx @firebaseextensions/fs-bq-import-collection --project=murphys-fsm-staging --source-collection-path=invoices --dataset=fsm_analytics --table-name-prefix=invoices --batch-size=300 --dataset-location=us --multi-threaded=true --non-interactive

echo "Backfilling equipment into BigQuery..."
npx @firebaseextensions/fs-bq-import-collection --project=murphys-fsm-staging --source-collection-path=equipment --dataset=fsm_analytics --table-name-prefix=equipment --batch-size=300 --dataset-location=us --multi-threaded=true --non-interactive

echo "Backfilling proposals into BigQuery..."
npx @firebaseextensions/fs-bq-import-collection --project=murphys-fsm-staging --source-collection-path=proposals --dataset=fsm_analytics --table-name-prefix=proposals --batch-size=300 --dataset-location=us --multi-threaded=true --non-interactive

echo "Backfilling maintenancePlans into BigQuery..."
npx @firebaseextensions/fs-bq-import-collection --project=murphys-fsm-staging --source-collection-path=maintenancePlans --dataset=fsm_analytics --table-name-prefix=maintenancePlans --batch-size=300 --dataset-location=us --multi-threaded=true --non-interactive

echo "Backfilling payments into BigQuery..."
npx @firebaseextensions/fs-bq-import-collection --project=murphys-fsm-staging --source-collection-path=payments --dataset=fsm_analytics --table-name-prefix=payments --batch-size=300 --dataset-location=us --multi-threaded=true --non-interactive

echo "Backfilling notes into BigQuery..."
npx @firebaseextensions/fs-bq-import-collection --project=murphys-fsm-staging --source-collection-path=notes --dataset=fsm_analytics --table-name-prefix=notes --batch-size=300 --dataset-location=us --multi-threaded=true --non-interactive

echo "Backfilling priceBook into BigQuery..."
npx @firebaseextensions/fs-bq-import-collection --project=murphys-fsm-staging --source-collection-path=priceBook --dataset=fsm_analytics --table-name-prefix=priceBook --batch-size=300 --dataset-location=us --multi-threaded=true --non-interactive

echo "Backfilling users into BigQuery..."
npx @firebaseextensions/fs-bq-import-collection --project=murphys-fsm-staging --source-collection-path=users --dataset=fsm_analytics --table-name-prefix=users --batch-size=300 --dataset-location=us --multi-threaded=true --non-interactive

echo "Backfilling dispatchGroups into BigQuery..."
npx @firebaseextensions/fs-bq-import-collection --project=murphys-fsm-staging --source-collection-path=dispatchGroups --dataset=fsm_analytics --table-name-prefix=dispatchGroups --batch-size=300 --dataset-location=us --multi-threaded=true --non-interactive

echo "Backfilling warranties into BigQuery..."
npx @firebaseextensions/fs-bq-import-collection --project=murphys-fsm-staging --source-collection-path=warranties --dataset=fsm_analytics --table-name-prefix=warranties --batch-size=300 --dataset-location=us --multi-threaded=true --non-interactive

echo "Backfilling calls into BigQuery..."
npx @firebaseextensions/fs-bq-import-collection --project=murphys-fsm-staging --source-collection-path=calls --dataset=fsm_analytics --table-name-prefix=calls --batch-size=300 --dataset-location=us --multi-threaded=true --non-interactive

echo "Backfilling timeClock into BigQuery..."
npx @firebaseextensions/fs-bq-import-collection --project=murphys-fsm-staging --source-collection-path=timeClock --dataset=fsm_analytics --table-name-prefix=timeClock --batch-size=300 --dataset-location=us --multi-threaded=true --non-interactive

echo "Backfilling time_entries into BigQuery..."
npx @firebaseextensions/fs-bq-import-collection --project=murphys-fsm-staging --source-collection-path=time_entries --dataset=fsm_analytics --table-name-prefix=time_entries --batch-size=300 --dataset-location=us --multi-threaded=true --non-interactive

echo "Backfilling archive_jobs into BigQuery..."
npx @firebaseextensions/fs-bq-import-collection --project=murphys-fsm-staging --source-collection-path=archive_jobs --dataset=fsm_analytics --table-name-prefix=archive_jobs --batch-size=300 --dataset-location=us --multi-threaded=true --non-interactive

echo "Backfilling archive_appointments into BigQuery..."
npx @firebaseextensions/fs-bq-import-collection --project=murphys-fsm-staging --source-collection-path=archive_appointments --dataset=fsm_analytics --table-name-prefix=archive_appointments --batch-size=300 --dataset-location=us --multi-threaded=true --non-interactive

echo "Backfilling archive_invoices into BigQuery..."
npx @firebaseextensions/fs-bq-import-collection --project=murphys-fsm-staging --source-collection-path=archive_invoices --dataset=fsm_analytics --table-name-prefix=archive_invoices --batch-size=300 --dataset-location=us --multi-threaded=true --non-interactive

echo "Backfilling archive_proposals into BigQuery..."
npx @firebaseextensions/fs-bq-import-collection --project=murphys-fsm-staging --source-collection-path=archive_proposals --dataset=fsm_analytics --table-name-prefix=archive_proposals --batch-size=300 --dataset-location=us --multi-threaded=true --non-interactive

echo "Backfilling archive_maintenancePlans into BigQuery..."
npx @firebaseextensions/fs-bq-import-collection --project=murphys-fsm-staging --source-collection-path=archive_maintenancePlans --dataset=fsm_analytics --table-name-prefix=archive_maintenancePlans --batch-size=300 --dataset-location=us --multi-threaded=true --non-interactive

echo "Backfilling archive_equipment into BigQuery..."
npx @firebaseextensions/fs-bq-import-collection --project=murphys-fsm-staging --source-collection-path=archive_equipment --dataset=fsm_analytics --table-name-prefix=archive_equipment --batch-size=300 --dataset-location=us --multi-threaded=true --non-interactive

echo "Backfilling archive_customers into BigQuery..."
npx @firebaseextensions/fs-bq-import-collection --project=murphys-fsm-staging --source-collection-path=archive_customers --dataset=fsm_analytics --table-name-prefix=archive_customers --batch-size=300 --dataset-location=us --multi-threaded=true --non-interactive