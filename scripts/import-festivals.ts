/**
 * Retired (RAZ-1055). Festivals used to be hardcoded in app/data/mock-*.ts and
 * copied into the database by this script. They are events now. Create and edit
 * one in Business → Events: type, programme, passes and line-up. Re-running an
 * import from those files would overwrite an organiser's edits, so this script
 * no longer writes.
 */
console.error('import-festivals.ts is retired. Edit a festival in Business → Events.')
process.exit(1)
