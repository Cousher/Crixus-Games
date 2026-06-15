import React, { useContext, useState } from "react";
import { login, googleLogin } from "../../../services/auth/auth";
import { saveTokens } from "../../../services/auth/authUtils";
import MainButton from "../../MainButton";
import UserContext from "../../../UserContext";
import { Tooltip } from "react-tooltip";
import { GoogleLogin } from '@react-oauth/google';
import { useTranslation } from "react-i18next";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loadingButton, setLoadingButton] = useState(false);
  const { toggleLogin } = useContext(UserContext);
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    setLoadingButton(true);
    e.preventDefault();
    try {
      await login(email, password)
        .then((response) => {
          saveTokens(response.token, "");
          toggleLogin();
        })
        .catch((error) => {
          console.log(error);
          setErrorMessage(
            error.response.data.message || t("auth.invalid")
          );
        });

      setLoadingButton(false);
    } catch (error) {
      setErrorMessage(t("auth.invalid"));
      setLoadingButton(false);
    }
  };

  const handleGoogleLoginSuccess = async (credentialResponse: any) => {
    try {
      const response = await googleLogin(credentialResponse.credential)
      const data = await response;
      if (data.token) {
        saveTokens(data.token, "");
        toggleLogin();
      }
    } catch (error) {
      console.error('Error during Google login', error);
    }
  };


  return (
    <div className="flex items-center justify-center transition-all ">
      <div className="max-w-md w-full space-y-4">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
            {t("auth.signInTitle")}
          </h2>
        </div>
        {errorMessage && (
          <div className="text-center text-red-500 ">{errorMessage}</div>
        )}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              {[
                {
                  type: "email",
                  name: "email",
                  autoComplete: "email",
                  required: true,
                  value: email,
                  onChange: (e: {
                    target: { value: React.SetStateAction<string> };
                  }) => setEmail(e.target.value),
                  className:
                    "appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none bg-white focus:ring-amber-500 focus:border-amber-500 focus:z-10 sm:text-sm",
                  placeholder: t("auth.email"),
                },
                {
                  type: "password",
                  name: "password",
                  autoComplete: "current-password",
                  required: true,
                  value: password,
                  onChange: (e: {
                    target: { value: React.SetStateAction<string> };
                  }) => setPassword(e.target.value),
                  className:
                    "appearance-none bg-white rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-amber-500 focus:border-amber-500 focus:z-10 sm:text-sm",
                  placeholder: t("auth.password"),
                },
              ].map((props, index) => {
                return <input key={index} {...props} />;
              })}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Tooltip id="my-tooltip" />

            <div className="text-sm">
              <a data-tooltip-id="my-tooltip"
                data-tooltip-content="Too bad for you 🙁"
                href="#"
                className="font-medium text-amber-600 hover:text-amber-500"
              >
                {t("auth.forgot")}
              </a>
            </div>
          </div>

          <div className="flex flex-col gap-2 items-center">
            <MainButton
              text={t("auth.signIn")}
              // eslint-disable-next-line @typescript-eslint/no-empty-function
              onClick={() => { }}
              disabled={loadingButton}
              loading={loadingButton}
              submit
            />

            <GoogleLogin
              onSuccess={handleGoogleLoginSuccess}
              onError={() => console.log('Login Failed')}
              auto_select={true}
              theme="outline"
            />


          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
