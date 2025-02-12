import * as shell from "shelljs";

// Copy all the view templates
shell.rm("-R", "dist/src/web/views")
shell.rm("-R", "dist/src/locale")
shell.rm("-R", "dist/src/data")
shell.rm("-R", "dist/src/assets")
shell.cp( "-R", "src/web/views", "dist/src/web/views" );
shell.cp( "-R", "src/locale", "dist/src/locale" );
shell.cp( "-R", "src/data", "dist/src/data" );
shell.cp( "-R", "src/assets", "dist/src/assets" );
shell.exec("node .");