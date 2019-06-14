function log_build(log, new_entry, sp) {
  var date = Utilities.formatDate(new Date(),db.timeZ, "'mm:ss_'mm:ss")
  
  log = log + '\n \n '+date+'==>\n'+ new_entry;
  
  if (sp && sp.Action == "Close") {
    send_log_to_man(log);
  };
  return log;
}


/**
Sends email. 
This service allows users to send emails with complete control over the content of the email. 
Unlike GmailApp, MailApp's sole purpose is sending email. 
MailApp cannot access a user's Gmail inbox.

Source: https://developers.google.com/apps-script/reference/mail/mail-app
*/
function send_log_to_man(log) {
  //Manager enail
  var man = Session.getActiveUser().getEmail(); 
  MailApp.sendEmail(man,
                    "CELT Ss: New report logs",
                    log);
}