# Assignment 1 Part 1

This is the Java project for Assignment 1 Part 1. The project is based on gradle and uses JUnit Jupiter as the testing framework. In the assignment you will write unit tests for a documented library `test_lib`. Your task is to *find problems* in the library documented in JUnit test cases and write a report over you reccomentations to the developers of `test_lib`.

## Building

You build using command `./gradlew build` - note that as you add test cases the build will fail as you are finding bugs.  

## Running
You build using command `./gradlew run -q --console=plain` - note that the project does not do anything meaningful. 

## Pipeline
A CI/CD pipeline is included in the project and will try to build the system on each push. Note that as you add (failing) test cases the pipeline will (and should) fail.

## VSCode
In some cases VSCode is does not load the libary properly and running in VSCode does not work and IntelliSense is reporting problems. This can often be fixed by using running  `Java: Clean Java Language Workspace Server` from the VSCode command palette.