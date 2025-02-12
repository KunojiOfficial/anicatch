import * as shell from "shelljs";

// Copy all the view templates
shell.rm("-R", "dist/src/web/views")
shell.rm("-R", "dist/src/locale")
shell.cp( "-R", "src/web/views", "dist/src/web/views" );
shell.cp( "-R", "src/locale", "dist/src/locale" );