export enum ApiEndpoint {
  // Config
  CONFIG = "/app-config",
  CHECK_AVAILABILITY = "/check-availability",
  GEO_LOCATION = "/geo-location",
  GET_COUNTRIES = "/country-list",


  // Auth - OTP Flow
  CHECK_USER = "/v3/auth/check-user",
  SEND_OTP = "/v3/auth/send-otp",
  VERIFY_OTP = "/v3/auth/verify-otp",
  VERIFY_SPECIAL_USER = "/auth/verify-special-user",
  REVOKE_SPECIAL_USER_SUBSCRIPTION = "/special-user/revoke-subscription",

  // Auth - Captcha
  VERIFY_CAPTCHA = "/v3/jojo/verify-captcha",

  // Auth - Social Login
  SOCIAL_LOGIN = "/v3/auth/social",
  GOOGLE_LOGIN = "/auth/google-login",
  FACEBOOK_LOGIN = "/auth/facebook-login",

  // Auth - Guest
  GUEST_LOGIN = "/v3/auth/guest",

  // Profile
  GET_PROFILES = "/profile",
  CREATE_PROFILE = "/profile",
  UPDATE_PROFILE = "/profile",
  GET_AVATARS = "/avatar",

  // Player
  GET_VIDEO_DETAILS = "/playback",

  // Content — Asset, Episodes, Playback
  GET_ASSET = "/asset",
  GET_EPISODES = "/episodes",
  GET_PLAYBACK = "/playback",
  SAVE_WATCH_PROGRESS = "/playback",
  GET_ASSET_PRICING = "/subscription/get-one-time-product",
  CHECK_ASSET_ACCESS_STATUS = "/user/check-asset-access-status",
  UPDATE_ENTITLEMENT = "/subscription/tvod/update-user-entitlement",
  GET_APP_NAVIGATION = "/getAppNavigation",
  SEARCH_API = "/search",

  // Invoice
  GET_INVOICE = "/subscription/list-invoice",
  DOWNLOAD_INVOICE = "/subscription/download-invoice",

  // Pairing
  PAIR = "/pair",
  // TODO(backend): confirm this path/response shape with backend — used to poll
  // whether a TV-displayed pairing code has been claimed by a mobile device yet.
  PAIR_STATUS = "/pair-status",

  //verify subscription 
  VERIFY_SUBSCRIPTION = "/subscription/verify-subscription",

  CONTENT_RAILS = "/content-rails",
  SUBSCRIPTION_ALL_PLANS = "/subscription/allplans",

  INITIATE_PAYMENT = "/subscription/initiate-payment",
  VERIFY_PAYMENT = "/subscription/verify-payment",
  CHECK_CARD_RECURRING_ELIGIBILITY = "/subscription/check-card-recurring-eligibility",

  // Ads — VMAP
  GET_VMAP = "/vmap",

  // Legal Policies
  LINK_HANDLER = "/linkHandler",
}