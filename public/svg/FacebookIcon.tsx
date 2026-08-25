

interface FacebookIconProps {
  className?: string;
}

export default function FacebookIcon({ className }: FacebookIconProps) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <g clipPath="url(#clip0_facebook)">
        <path
          d="M22.4309 20.9656L23.3288 16.0762H18.1028V14.347C18.1028 11.7635 19.1165 10.7696 21.7398 10.7696C22.5544 10.7696 23.2104 10.7895 23.588 10.8292V6.39742C22.8725 6.19839 21.1235 6 20.1098 6C14.7635 6 12.299 8.52402 12.299 13.9695V16.0762H9V20.9656H12.299V31.6043C13.5367 31.9115 14.8313 32.0753 16.1638 32.0753C16.8197 32.0753 17.4667 32.035 18.1022 31.9582V20.9656H22.4303H22.4309Z"
          fill="currentColor"
        />
      </g>
      <defs>
        <clipPath id="clip0_facebook">
          <rect width="32" height="32" rx="16" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
}
