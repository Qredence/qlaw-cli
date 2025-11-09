# Security Policy

## Supported Versions

We release patches for security vulnerabilities in the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |
| < 0.1.0 | :x:                |

## Reporting a Vulnerability

We take the security of qlaw-cli seriously. If you have discovered a security vulnerability, we appreciate your help in disclosing it to us in a responsible manner.

### Please do the following:

1. **Do not** open a public GitHub issue for the vulnerability
2. Email your findings to [security contact - add your email here]
3. Include the following information in your report:
   - Type of vulnerability
   - Full paths of source file(s) related to the vulnerability
   - The location of the affected source code (tag/branch/commit or direct URL)
   - Any special configuration required to reproduce the issue
   - Step-by-step instructions to reproduce the issue
   - Proof-of-concept or exploit code (if possible)
   - Impact of the issue, including how an attacker might exploit it

### What to expect:

- We will acknowledge receipt of your vulnerability report within 48 hours
- We will provide a more detailed response within 7 days indicating the next steps
- We will work with you to understand and validate the issue
- We will keep you informed about our progress towards a fix
- We will notify you when the vulnerability is fixed

### Safe Harbor

We support safe harbor for security researchers who:

* Make a good faith effort to avoid privacy violations, destruction of data, and interruption or degradation of our services
* Only interact with accounts you own or with explicit permission of the account holder
* Do not exploit a security issue you discover for any reason (including for personal gain or to demonstrate the issue to others)
* Give us a reasonable amount of time to resolve the issue before any disclosure to the public or a third-party

We will:

* Not pursue legal action against researchers who follow this policy
* Work with researchers to understand and resolve the issue quickly
* Recognize researchers who have helped us improve our security

## Security Best Practices for Users

When using qlaw-cli:

1. **API Keys**: Never commit API keys or secrets to version control
   - Use `.env` files for local development
   - Add `.env` to `.gitignore`
   - Use environment variables in production

2. **Dependencies**: Keep dependencies up to date
   ```bash
   bun update
   ```

3. **Environment Variables**: Use the provided `.env.example` as a template
   - Never share your `.env` file
   - Rotate API keys if they are exposed

4. **Terminal Security**: 
   - Be cautious when running in shared environments
   - Clear sensitive data from chat history when needed using `/clear`
   - Be aware that terminal history may persist

5. **Network Security**:
   - Use HTTPS endpoints for API calls
   - Verify SSL certificates
   - Be cautious with proxy settings

## Known Security Considerations

### Local Storage
- Session data and settings are stored in browser-like localStorage (when available)
- This data is stored in plain text
- Consider the security implications for sensitive conversations
- Use `/clear` to remove chat history

### API Integration
- API keys are used directly in the application
- Ensure you're using environment variables, not hardcoded keys
- Be aware of rate limits and quotas on your API keys

### Terminal Environment
- The application runs in your terminal with your user permissions
- Be cautious about what commands you execute via custom commands
- Review custom commands before execution

## Security Updates

Security updates will be released as soon as possible after a vulnerability is confirmed. We recommend:

- Watch this repository for security updates
- Subscribe to release notifications
- Keep your installation up to date

## Attribution

We appreciate the security research community and will credit researchers who responsibly disclose vulnerabilities (unless they prefer to remain anonymous).

## Questions?

If you have questions about this security policy, please open a general issue (not security-related) or contact the maintainers.

---

**Note**: This security policy is subject to change. Please check back regularly for updates.

Last updated: November 8, 2025
