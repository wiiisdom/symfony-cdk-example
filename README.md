# Symfony 5 CDK Example project

This is a example project with a _Symfony 5_ app deployed using CDK on AWS.

## Folder structure

```
symfony-cdk-example/
    app/ # The Symfony project
        docker/ # Dockerfile(s) of the project
    bin/ # CDK app description
    lib/ # CDK stack definitions
    test/ # CDK tests
    docker-compose.yml # docker-compose configuration for local development
```

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Develop?

Using `docker-compose`:

```
docker-compose up
```

And go to `http://localhost:8000`

## Deploy?

Using `CDK`:

You will need valid AWS credentials.

```
npm install && cdk deploy SymfonyAppDevStack
```

## Remove deployment?

```
cdk destroy SymfonyAppDevStack
```

## Contributing

Please submit a pull request or a bug on the project!

## Authors

* Julien Bras - Initial work - [julbrs](https://github.com/julbrs)

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details