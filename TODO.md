# TODO: Fix TypeScript Error in lib/db.ts

- [x] Make db.all method generic: `all<T>(sql: string, params?: any[]): Promise<T[]>`
- [x] Make db.get method generic: `get<T>(sql: string, params?: any[]): Promise<T | null>`
- [x] Update txDb in transaction method to match generics
- [x] Test the changes to ensure no runtime errors
