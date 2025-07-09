import Mailgen from "mailgen";
import nodemailer from "nodemailer";


const sendEmail = async(options)=>{
   const mailGenerator = new Mailgen({
        theme: 'default',
        product: {
            // Appears in header & footer of e-mails
            name: 'Task Manager',
            link: 'https://mailgen.js/'
            // Optional product logo
            // logo: 'https://mailgen.js/img/logo.png'
        },
       
    });
  let emailText = mailGenerator.generatePlaintext(options.mailGenContent);
   let emailHtml = mailGenerator.generate(options.mailGenContent);

        ////Node mailer
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: false, // upgrade later with STARTTLS
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      console.log("testing mail options here ----------------- --------------",options);
      

      const info = await transporter.sendMail({
        from: '"PetVitals" <amarveer.nz@gmail.com>',
        to: options.email,
        subject: options.subject,
        text: emailText, // plain‑text body
        html: emailHtml, // HTML body
      });
    
      try {

      } catch (error) {
        console.log("Failed to send email ",error)
      }
}

const emailVerificationMailGenContent = async(userName,verificationUrl)=>{

    return {
        body:{
            name:userName,
            intro:" Welcome to our app ! We\'re very excited to have you on board.",
            action:{
                instructions:"To get started, Please click here - ",
                button: {
                    color: '#22BC66', // Optional action button color
                    text: 'Confirm your account',
                    link: verificationUrl,
                }
            },


        }
    }


}

const forgotPasswordContent = (userName,passwordUrl)=>{
            console.log("USerANme , password Url", userName, passwordUrl);
            
    return{
        body:{
            name:userName,
            intro:" We got a request to reset your password ",
            action:{
                instructions:"To change password, Please click here - ",
                button: {
                    color: '#22BC86', 
                    text: 'Reset Password',
                    link: passwordUrl,
                }
            },
        }
    }
}

const claimAccountEmail = (userName,claimUrl) =>{
    console.log("Claim account email info",userName,claimUrl);
    
    return{
        body:{
            name:userName,
             intro:" Vet have created your account. Please follow the instructions to claim it. Link is only valid upto 1 hour from the time it has been recieved ",
            action:{
                instructions:"To claim your account, Please click here - ",
                button: {
                    color: '#22BC86', 
                    text: 'Claim Account',
                    link: claimUrl,
                }
            },
        }
    }

}
 
export {sendEmail,emailVerificationMailGenContent,forgotPasswordContent,claimAccountEmail}