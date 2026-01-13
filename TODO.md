# TODO: Replace bcryptjs with bcrypt

- [ ] Update package.json: remove bcryptjs and @types/bcryptjs, add bcrypt and @types/bcrypt
- [ ] Delete bcryptjs.d.ts file
- [ ] Update import in lib/db.ts from 'bcryptjs' to 'bcrypt'
- [ ] Update import in app/users/actions.ts from 'bcryptjs' to 'bcrypt'
- [ ] Update import in app/api/seed/route.ts from 'bcryptjs' to 'bcrypt'
- [ ] Update import in app/login/actions.ts from 'bcryptjs' to 'bcrypt'
- [ ] Run npm install to update dependencies
- [ ] Verify build compiles without type errors
